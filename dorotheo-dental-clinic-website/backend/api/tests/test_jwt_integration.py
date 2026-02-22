"""
Integration tests for JWT Authentication — end-to-end flows.

Run with: python manage.py test api.tests.test_jwt_integration -v2
"""

from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import User


# ---------------------------------------------------------------------------
# Shared settings: disable rate-limiting and async audit for test stability
# ---------------------------------------------------------------------------
JWT_INTEGRATION_SETTINGS = dict(
    RATELIMIT_ENABLE=False,
    AUDIT_ASYNC_LOGGING=False,
)

# The Vercel front-end origin used in CORS tests
VERCEL_ORIGIN = 'https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app'


def _make_user(username='testuser', password='testpass123', user_type='patient', **kwargs):
    """Create a user for integration tests."""
    return User.objects.create_user(
        username=username,
        password=password,
        email=kwargs.pop('email', f'{username}@test.com'),
        user_type=user_type,
        **kwargs,
    )


# ---------------------------------------------------------------------------
# Integration Tests
# ---------------------------------------------------------------------------

@override_settings(**JWT_INTEGRATION_SETTINGS)
class FullLoginRefreshLogoutCycleTest(TestCase):
    """
    1. Login via /api/auth/login/
    2. Use access token on GET /api/profile/
    3. Refresh via /api/auth/token/refresh/
    4. Verify new access token works
    5. Logout via /api/auth/logout/
    6. Verify refresh with old cookie now fails (401)
    """

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user()

    def test_full_login_refresh_logout_cycle(self):
        # --- Step 1: Login ---
        login_resp = self.client.post(
            '/api/auth/login/',
            {'username': 'testuser', 'password': 'testpass123'},
            format='json',
        )
        self.assertEqual(login_resp.status_code, 200)
        access_token = login_resp.json()['access']
        refresh_cookie = login_resp.cookies[settings.REFRESH_COOKIE_NAME].value
        self.assertTrue(len(access_token) > 20)
        self.assertTrue(len(refresh_cookie) > 20)

        # --- Step 2: Use access token on protected endpoint ---
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_resp = self.client.get('/api/profile/')
        self.assertEqual(profile_resp.status_code, 200)
        self.assertEqual(profile_resp.json()['username'], 'testuser')

        # --- Step 3: Refresh ---
        self.client.credentials()  # clear Bearer header
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = refresh_cookie
        refresh_resp = self.client.post('/api/auth/token/refresh/', format='json')
        self.assertEqual(refresh_resp.status_code, 200)
        new_access = refresh_resp.json()['access']
        self.assertTrue(len(new_access) > 20)

        # Grab the rotated refresh cookie for the logout step
        new_refresh_cookie = refresh_resp.cookies[settings.REFRESH_COOKIE_NAME].value
        self.assertTrue(len(new_refresh_cookie) > 20)

        # --- Step 4: Verify new access token works ---
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_access}')
        profile_resp2 = self.client.get('/api/profile/')
        self.assertEqual(profile_resp2.status_code, 200)

        # --- Step 5: Logout ---
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = new_refresh_cookie
        logout_resp = self.client.post('/api/auth/logout/', format='json')
        self.assertEqual(logout_resp.status_code, 200)
        self.assertIn('message', logout_resp.json())

        # --- Step 6: Refresh with old cookie fails ---
        self.client.credentials()
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = new_refresh_cookie
        stale_refresh_resp = self.client.post('/api/auth/token/refresh/', format='json')
        self.assertEqual(stale_refresh_resp.status_code, 401)


@override_settings(**JWT_INTEGRATION_SETTINGS)
class ConcurrentRefreshSafetyTest(TestCase):
    """
    Verify that using a rotated (blacklisted) refresh token fails with 401.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(username='concuser')

    def test_concurrent_refresh_safety(self):
        # Login
        login_resp = self.client.post(
            '/api/auth/login/',
            {'username': 'concuser', 'password': 'testpass123'},
            format='json',
        )
        self.assertEqual(login_resp.status_code, 200)
        original_refresh = login_resp.cookies[settings.REFRESH_COOKIE_NAME].value

        # First refresh — should succeed
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = original_refresh
        refresh1 = self.client.post('/api/auth/token/refresh/', format='json')
        self.assertEqual(refresh1.status_code, 200)
        self.assertIn('access', refresh1.json())

        # Second refresh with the ORIGINAL cookie — should fail (blacklisted)
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = original_refresh
        refresh2 = self.client.post('/api/auth/token/refresh/', format='json')
        self.assertEqual(refresh2.status_code, 401)


@override_settings(**JWT_INTEGRATION_SETTINGS)
class CORSPreflightTest(TestCase):
    """
    Verify CORS preflight (OPTIONS) on /api/auth/login/ includes the
    required Access-Control-* headers for the Vercel origin.
    """

    def setUp(self):
        self.client = APIClient()

    def test_cors_preflight_auth_endpoint(self):
        resp = self.client.options(
            '/api/auth/login/',
            HTTP_ORIGIN=VERCEL_ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type',
        )
        # Successful preflight returns 200 or 204
        self.assertIn(resp.status_code, [200, 204])

        # Access-Control-Allow-Origin must match the request origin
        allow_origin = resp.get('Access-Control-Allow-Origin', '')
        self.assertIn(VERCEL_ORIGIN, allow_origin)

        # Credentials must be allowed
        allow_creds = resp.get('Access-Control-Allow-Credentials', '')
        self.assertEqual(allow_creds.lower(), 'true')

        # POST must be among the allowed methods
        allow_methods = resp.get('Access-Control-Allow-Methods', '').upper()
        self.assertIn('POST', allow_methods)


@override_settings(**JWT_INTEGRATION_SETTINGS)
class CORSCredentialsHeaderTest(TestCase):
    """
    Verify that actual POST responses to /api/auth/login/ include
    Access-Control-Allow-Credentials: true.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(username='corsuser')

    def test_cors_credentials_header(self):
        resp = self.client.post(
            '/api/auth/login/',
            {'username': 'corsuser', 'password': 'testpass123'},
            format='json',
            HTTP_ORIGIN=VERCEL_ORIGIN,
        )
        self.assertEqual(resp.status_code, 200)
        allow_creds = resp.get('Access-Control-Allow-Credentials', '')
        self.assertEqual(allow_creds.lower(), 'true')


@override_settings(**JWT_INTEGRATION_SETTINGS)
class OldEndpointsStillWorkTest(TestCase):
    """
    Backward compatibility: the legacy /api/login/ endpoint must still
    return {token, user} using DRF TokenAuthentication.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(username='legacyuser')

    def test_old_endpoints_still_work(self):
        resp = self.client.post(
            '/api/login/',
            {'username': 'legacyuser', 'password': 'testpass123'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Legacy response shape
        self.assertIn('token', data)
        self.assertIn('user', data)

        # Token is a DRF Token (40-char hex)
        self.assertEqual(len(data['token']), 40)

        # Verify this token actually works on a protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {data["token"]}')
        profile = self.client.get('/api/profile/')
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.json()['username'], 'legacyuser')
