"""
Unit tests for JWT Authentication views.

Run with: python manage.py test api.tests.test_jwt_auth -v2
"""

import time
from datetime import timedelta

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import User


# ---------------------------------------------------------------------------
# Helper: shared settings override so rate-limiting doesn't interfere
# ---------------------------------------------------------------------------
JWT_TEST_SETTINGS = dict(
    RATELIMIT_ENABLE=False,
    AUDIT_ASYNC_LOGGING=False,
)


def make_patient(username='patient1', password='testpass123', email=None, archived=False):
    user = User.objects.create_user(
        username=username,
        password=password,
        email=email or f'{username}@test.com',
        user_type='patient',
    )
    if archived:
        user.is_archived = True
        user.save(update_fields=['is_archived'])
    return user


def make_staff(username='staff1', password='testpass123', email=None, archived=False):
    user = User.objects.create_user(
        username=username,
        password=password,
        email=email or f'{username}@test.com',
        user_type='staff',
        role='dentist',
    )
    if archived:
        user.is_archived = True
        user.save(update_fields=['is_archived'])
    return user


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@override_settings(**JWT_TEST_SETTINGS)
class JWTLoginTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/login/'
        self.patient = make_patient()
        self.staff = make_staff()

    def test_jwt_login_success(self):
        """200, access token in body, refresh NOT in body, Set-Cookie with proper flags."""
        resp = self.client.post(self.url, {'username': 'patient1', 'password': 'testpass123'}, format='json')

        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # access token present in body
        self.assertIn('access', data)
        self.assertTrue(len(data['access']) > 20)

        # refresh token NOT in body
        self.assertNotIn('refresh', data)

        # legacy_token present (backward compat)
        self.assertIn('legacy_token', data)

        # user data present
        self.assertIn('user', data)

        # Set-Cookie with HttpOnly + Path + SameSite
        cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)
        self.assertIsNotNone(cookie, "refresh_token cookie must be set")
        self.assertTrue(cookie['httponly'], "Cookie must be HttpOnly")
        self.assertEqual(cookie['path'], settings.REFRESH_COOKIE_PATH)
        self.assertEqual(cookie['samesite'].lower(), settings.REFRESH_COOKIE_SAMESITE.lower())

    def test_jwt_login_email(self):
        """Login with email address instead of username should succeed."""
        resp = self.client.post(self.url, {'username': 'patient1@test.com', 'password': 'testpass123'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.json())

    def test_jwt_login_invalid(self):
        """Wrong credentials → 401, no cookie set."""
        resp = self.client.post(self.url, {'username': 'patient1', 'password': 'wrongpass'}, format='json')
        self.assertEqual(resp.status_code, 401)
        cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)
        self.assertFalse(bool(cookie and cookie.value), "No refresh cookie should be set on failed login")

    def test_jwt_login_archived_staff(self):
        """Archived staff account → 403."""
        archived_staff = make_staff(username='archivedstaff', archived=True)
        resp = self.client.post(self.url, {'username': 'archivedstaff', 'password': 'testpass123'}, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertIn('archived', resp.json()['error'].lower())

    def test_jwt_login_patient_unarchive(self):
        """Archived patient successfully logs in — account is auto-unarchived."""
        archived_patient = make_patient(username='archivedpatient', archived=True)
        self.assertTrue(archived_patient.is_archived)

        resp = self.client.post(self.url, {'username': 'archivedpatient', 'password': 'testpass123'}, format='json')
        self.assertEqual(resp.status_code, 200)

        archived_patient.refresh_from_db()
        self.assertFalse(archived_patient.is_archived, "Patient should be auto-unarchived on login")

    @override_settings(RATELIMIT_ENABLE=True)
    def test_jwt_login_rate_limit(self):
        """6 rapid login attempts from same IP → 429 on the 6th."""
        for i in range(5):
            self.client.post(self.url, {'username': 'patient1', 'password': 'wrong'}, format='json',
                             REMOTE_ADDR='10.0.0.1')
        resp = self.client.post(self.url, {'username': 'patient1', 'password': 'wrong'}, format='json',
                                REMOTE_ADDR='10.0.0.1')
        self.assertEqual(resp.status_code, 429)


@override_settings(**JWT_TEST_SETTINGS)
class JWTRegisterTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/register/'

    def test_jwt_register_success(self):
        """New patient registered → 201, access token + cookie set."""
        payload = {
            'username': 'newpatient',
            'password': 'SecurePass!99',
            'email': 'newpatient@test.com',
            'first_name': 'New',
            'last_name': 'Patient',
            'user_type': 'patient',
        }
        resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn('access', data)
        self.assertIn('legacy_token', data)
        self.assertIn('user', data)
        cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)
        self.assertIsNotNone(cookie)
        self.assertTrue(len(cookie.value) > 20)

    def test_jwt_register_validation(self):
        """Duplicate username → 400 with validation errors."""
        make_patient(username='existingpatient')
        payload = {
            'username': 'existingpatient',
            'password': 'SecurePass!99',
            'email': 'other@test.com',
            'user_type': 'patient',
        }
        resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(resp.status_code, 400)


@override_settings(**JWT_TEST_SETTINGS)
class JWTTokenRefreshTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.refresh_url = '/api/auth/token/refresh/'
        self.patient = make_patient()

    def _login(self):
        """Helper: login and return the refresh cookie value."""
        resp = self.client.post('/api/auth/login/', {'username': 'patient1', 'password': 'testpass123'}, format='json')
        self.assertEqual(resp.status_code, 200)
        return resp.cookies[settings.REFRESH_COOKIE_NAME].value

    def test_jwt_refresh_success(self):
        """Valid refresh cookie → 200 with new access token; new refresh cookie set."""
        refresh_val = self._login()
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = refresh_val
        resp = self.client.post(self.refresh_url, format='json')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('access', data)
        # New refresh cookie should be set (rotation)
        new_cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)
        self.assertIsNotNone(new_cookie)

    def test_jwt_refresh_no_cookie(self):
        """No cookie → 401."""
        resp = self.client.post(self.refresh_url, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_jwt_refresh_expired(self):
        """Tampered / expired token string → 401 and cookie cleared."""
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = 'this.is.not.a.valid.jwt'
        resp = self.client.post(self.refresh_url, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_jwt_refresh_blacklisted(self):
        """Blacklisted refresh token → 401."""
        refresh_obj = RefreshToken.for_user(self.patient)
        raw = str(refresh_obj)
        refresh_obj.blacklist()

        self.client.cookies[settings.REFRESH_COOKIE_NAME] = raw
        resp = self.client.post(self.refresh_url, format='json')
        self.assertEqual(resp.status_code, 401)


@override_settings(**JWT_TEST_SETTINGS)
class JWTLogoutTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.logout_url = '/api/auth/logout/'
        self.patient = make_patient()

    def test_jwt_logout_success(self):
        """Logout with valid refresh cookie → 200, cookie cleared, refresh blacklisted."""
        # Login first
        login_resp = self.client.post('/api/auth/login/', {'username': 'patient1', 'password': 'testpass123'}, format='json')
        refresh_val = login_resp.cookies[settings.REFRESH_COOKIE_NAME].value
        access_val = login_resp.json()['access']

        # Authenticate with access token then logout
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_val}')
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = refresh_val
        resp = self.client.post(self.logout_url, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('message', resp.json())

        # Cookie should be cleared (max_age=0 or empty value)
        cleared_cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)
        self.assertTrue(
            cleared_cookie is None or cleared_cookie.get('max-age') == 0 or cleared_cookie.value == '',
            "Refresh cookie should be cleared after logout"
        )

        # The refresh token should now be blacklisted — refresh attempt should fail
        self.client.credentials()
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = refresh_val
        refresh_resp = self.client.post('/api/auth/token/refresh/', format='json')
        self.assertEqual(refresh_resp.status_code, 401)

    def test_jwt_logout_no_cookie(self):
        """Logout without a cookie → 200 (graceful)."""
        resp = self.client.post(self.logout_url, format='json')
        self.assertEqual(resp.status_code, 200)


@override_settings(**JWT_TEST_SETTINGS)
class JWTVerifyTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.verify_url = '/api/auth/verify/'
        self.patient = make_patient()

    def test_jwt_verify_success(self):
        """Valid Bearer access token → 200 with user data."""
        refresh = RefreshToken.for_user(self.patient)
        access = str(refresh.access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        resp = self.client.get(self.verify_url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('user', data)
        self.assertEqual(data['user']['username'], 'patient1')

    def test_jwt_verify_expired(self):
        """Expired access token → 401."""
        with override_settings(SIMPLE_JWT={
            **settings.SIMPLE_JWT,
            'ACCESS_TOKEN_LIFETIME': timedelta(seconds=0),
        }):
            refresh = RefreshToken.for_user(self.patient)
            # Force an expired token by manipulating the payload
            from rest_framework_simplejwt.tokens import AccessToken
            from datetime import datetime
            access_obj = AccessToken.for_user(self.patient)
            access_obj.set_exp(lifetime=timedelta(seconds=-1))
            expired_token = str(access_obj)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired_token}')
        resp = self.client.get(self.verify_url)
        self.assertEqual(resp.status_code, 401)

    def test_jwt_verify_no_token(self):
        """No Authorization header → 401."""
        resp = self.client.get(self.verify_url)
        self.assertEqual(resp.status_code, 401)


@override_settings(**JWT_TEST_SETTINGS)
class JWTProtectedEndpointTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.patient = make_patient()
        self.staff = make_staff()

    def test_access_token_on_protected_endpoint(self):
        """Bearer JWT access token works on /api/profile/."""
        refresh = RefreshToken.for_user(self.patient)
        access = str(refresh.access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        resp = self.client.get('/api/profile/')
        self.assertEqual(resp.status_code, 200)

    def test_legacy_token_still_works(self):
        """DRF Token (legacy) works on /api/profile/."""
        drf_token, _ = Token.objects.get_or_create(user=self.patient)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {drf_token.key}')
        resp = self.client.get('/api/profile/')
        self.assertEqual(resp.status_code, 200)


@override_settings(**JWT_TEST_SETTINGS)
class JWTCookieFlagTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.patient = make_patient()

    def test_cookie_flags(self):
        """Verify all cookie security flags after login."""
        resp = self.client.post(
            '/api/auth/login/',
            {'username': 'patient1', 'password': 'testpass123'},
            format='json'
        )
        self.assertEqual(resp.status_code, 200)

        cookie = resp.cookies.get(settings.REFRESH_COOKIE_NAME)
        self.assertIsNotNone(cookie, "refresh_token cookie must be set")

        # HttpOnly flag
        self.assertTrue(cookie['httponly'], "Must be HttpOnly")

        # Path scope
        self.assertEqual(cookie['path'], '/api/auth/')

        # SameSite
        self.assertEqual(cookie['samesite'].lower(), 'none')

        # Max-Age
        self.assertEqual(int(cookie['max-age']), settings.REFRESH_COOKIE_MAX_AGE)
