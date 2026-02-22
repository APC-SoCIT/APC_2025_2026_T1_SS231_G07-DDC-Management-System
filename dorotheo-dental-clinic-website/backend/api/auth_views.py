"""
JWT Authentication Views — HttpOnly Cookie-Based Token Lifecycle

Implements:
  - jwt_login       POST /api/auth/login/
  - jwt_register    POST /api/auth/register/
  - jwt_token_refresh  POST /api/auth/token/refresh/
  - jwt_logout      POST /api/auth/logout/
  - jwt_verify      GET  /api/auth/verify/

All views are CSRF-exempt since they rely on JWT validation rather than
Django session authentication.
"""

import logging

from django.conf import settings
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from django_ratelimit.decorators import ratelimit

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .audit_service import create_audit_log, get_client_ip, get_user_agent
from .models import User
from .serializers import UserSerializer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

def set_refresh_cookie(response, refresh_token: str) -> None:
    """Attach the HttpOnly refresh-token cookie to *response*."""
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_COOKIE_MAX_AGE,
        path=settings.REFRESH_COOKIE_PATH,
        httponly=settings.REFRESH_COOKIE_HTTPONLY,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        secure=settings.REFRESH_COOKIE_SECURE,
        domain=settings.REFRESH_COOKIE_DOMAIN,
    )


def clear_refresh_cookie(response) -> None:
    """Clear the refresh-token cookie by setting max_age=0."""
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )
    # Explicitly set to empty with max_age=0 to ensure cross-browser clearing
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value='',
        max_age=0,
        path=settings.REFRESH_COOKIE_PATH,
        httponly=settings.REFRESH_COOKIE_HTTPONLY,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        secure=settings.REFRESH_COOKIE_SECURE,
        domain=settings.REFRESH_COOKIE_DOMAIN,
    )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
@ratelimit(key='ip', rate='5/m', block=False)
def jwt_login(request):
    """
    POST /api/auth/login/

    Accepts: { username, password }
    Returns: { access, user, legacy_token }
    Sets:    HttpOnly refresh_token cookie
    """
    # Manual rate-limit check so we can return 429 (not 403)
    if getattr(request, 'limited', False) or getattr(getattr(request, '_request', request), 'limited', False):
        return Response({'error': 'Too many login attempts. Please try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    username = request.data.get('username')
    password = request.data.get('password')
    logger.info("[JWT] Login attempt for: %s", username)

    # Try direct username auth first
    user = authenticate(username=username, password=password)

    # Fall back to email lookup
    if not user:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
            logger.info("[JWT] Found user by email: %s → %s", username, getattr(user_obj, 'username', None))
        except User.DoesNotExist:
            logger.info("[JWT] No user found with email: %s", username)

    if user:
        # Block archived staff
        if user.user_type == 'staff' and user.is_archived:
            logger.warning("[JWT] Archived staff login blocked: %s", username)
            # Audit failed login for archived staff
            try:
                create_audit_log(
                    actor=None,
                    action_type='LOGIN_FAILED',
                    target_table='User',
                    target_record_id=user.id,
                    patient_id=None,
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                    changes={'username': username, 'reason': 'archived_staff'}
                )
            except Exception as exc:
                logger.error("[Audit] Failed to log archived-staff login attempt: %s", exc)
            return Response(
                {'error': 'Your account has been archived. Please contact the owner to regain access.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Auto-unarchive patients
        if user.user_type == 'patient' and user.is_archived:
            user.is_archived = False
            user.save(update_fields=['is_archived'])
            logger.info("[JWT] Patient auto-unarchived on login: %s", username)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        # Also create/update DRF Token for backward compat
        drf_token, _ = Token.objects.get_or_create(user=user)

        serializer = UserSerializer(user)

        # Audit successful login
        try:
            create_audit_log(
                actor=user,
                action_type='LOGIN_SUCCESS',
                target_table='User',
                target_record_id=user.id,
                patient_id=user.id if user.user_type == 'patient' else None,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                changes={'username': username}
            )
        except Exception as exc:
            logger.error("[Audit] Failed to log successful JWT login: %s", exc)

        response = Response({
            'access': access_token,
            'user': serializer.data,
            'legacy_token': drf_token.key,
        })
        set_refresh_cookie(response, str(refresh))
        logger.info("[JWT] Login successful for: %s", username)
        return response

    # Authentication failed
    try:
        create_audit_log(
            actor=None,
            action_type='LOGIN_FAILED',
            target_table='User',
            target_record_id=None,
            patient_id=None,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            changes={'username': username}
        )
    except Exception as exc:
        logger.error("[Audit] Failed to log JWT login failure: %s", exc)

    logger.warning("[JWT] Login failed for: %s from IP: %s", username, get_client_ip(request))
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def jwt_register(request):
    """
    POST /api/auth/register/

    Accepts: registration payload (same as legacy register)
    Returns: { access, user, legacy_token }
    Sets:    HttpOnly refresh_token cookie
    """
    logger.info("[JWT] Registration request received: %s", request.data)

    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.set_password(request.data.get('password'))
        user.save()

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        # DRF Token for backward compat
        drf_token, _ = Token.objects.get_or_create(user=user)

        logger.info("[JWT] User registered: %s", user.username)

        response = Response(
            {'access': access_token, 'user': serializer.data, 'legacy_token': drf_token.key},
            status=status.HTTP_201_CREATED
        )
        set_refresh_cookie(response, str(refresh))
        return response

    logger.error("[JWT] Registration serializer errors: %s", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def jwt_token_refresh(request):
    """
    POST /api/auth/token/refresh/

    Reads refresh token from HttpOnly cookie (NOT request body).
    Returns: { access }
    Sets:    new HttpOnly refresh_token cookie (rotation)
    """
    raw_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)

    if not raw_token:
        logger.info("[JWT] Token refresh attempted — no cookie present")
        return Response({'detail': 'Refresh token not found'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        old_refresh = RefreshToken(raw_token)
        # Validate and generate a new access token from the current refresh
        new_access = str(old_refresh.access_token)

        # Blacklist the old refresh token to prevent replay attacks.
        # Note: simplejwt's automatic BLACKLIST_AFTER_ROTATION only works
        # through the built-in serializer — we must blacklist manually here.
        old_refresh.blacklist()

        # Issue a brand-new refresh token for the same user
        from .models import User as UserModel
        user = UserModel.objects.get(id=old_refresh['user_id'])
        new_refresh_obj = RefreshToken.for_user(user)
        new_refresh = str(new_refresh_obj)
    except TokenError as exc:
        logger.warning("[JWT] Token refresh failed: %s", exc)
        error_response = Response(
            {'detail': 'Refresh token is invalid, expired, or has been blacklisted'},
            status=status.HTTP_401_UNAUTHORIZED
        )
        clear_refresh_cookie(error_response)
        return error_response

    response = Response({'access': new_access})
    set_refresh_cookie(response, new_refresh)
    return response


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def jwt_logout(request):
    """
    POST /api/auth/logout/

    Blacklists the refresh token found in the HttpOnly cookie.
    Deletes DRF Token if present (backward compat cleanup).
    Returns: { message }
    """
    raw_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)

    # Audit logout (best-effort — user may already be unauthenticated via expired access)
    actor = request.user if request.user and request.user.is_authenticated else None
    try:
        create_audit_log(
            actor=actor,
            action_type='LOGOUT',
            target_table='User',
            target_record_id=actor.id if actor else None,
            patient_id=actor.id if actor and actor.user_type == 'patient' else None,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
    except Exception as exc:
        logger.error("[Audit] Failed to log JWT logout: %s", exc)

    if raw_token:
        try:
            refresh = RefreshToken(raw_token)
            refresh.blacklist()
            logger.info("[JWT] Refresh token blacklisted on logout")
        except TokenError as exc:
            # Token already invalid — that's fine, proceed with logout
            logger.info("[JWT] Logout: token was already invalid/expired: %s", exc)

    # Delete DRF Token if actor is known
    if actor:
        try:
            Token.objects.filter(user=actor).delete()
        except Exception as exc:
            logger.error("[JWT] Failed to delete DRF token on logout: %s", exc)

    response = Response({'message': 'Logged out successfully'})
    clear_refresh_cookie(response)
    return response


# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def jwt_verify(request):
    """
    GET /api/auth/verify/

    Requires: Authorization: Bearer <access_jwt>
    Returns:  { user: { ... } }
    """
    serializer = UserSerializer(request.user)
    return Response({'user': serializer.data})
