from pathlib import Path
import os
import dj_database_url
import sentry_sdk

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Django settings for Dorotheo Dental Clinic

sentry_sdk.init(
    dsn="https://781448b07a13e31e920ab805235c199e@o4510867383713792.ingest.us.sentry.io/4510867452067840",
    # Add data like request headers and IP for users,
    # see https://docs.sentry.io/platforms/python/data-management/data-collected/ for more info
    send_default_pii=True,
)

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-key-change-in-production')

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# ALLOWED_HOSTS configuration - support Azure and custom hosts
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')
# Add Azure hostname if running on Azure
if 'WEBSITE_HOSTNAME' in os.environ:
    ALLOWED_HOSTS.append(os.environ['WEBSITE_HOSTNAME'])
# Clean up empty strings and duplicates
ALLOWED_HOSTS = list(set(filter(None, ALLOWED_HOSTS)))

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # Audit middleware - must be after AuthenticationMiddleware
    'api.middleware.AuditMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'dental_clinic.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'dental_clinic.wsgi.application'

# Database Configuration
# Default to Supabase PostgreSQL if DATABASE_URL is set, otherwise use SQLite for local development
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
        conn_health_checks=True,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'api.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Public by default - sensitive endpoints have explicit IsAuthenticated
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    # Pagination settings for improved performance
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,  # Return 20 items per page by default
}

# CORS Configuration - Use specific allowed origins when credentials are needed
# Cannot use CORS_ALLOW_ALL_ORIGINS with CORS_ALLOW_CREDENTIALS due to browser security
CORS_ALLOWED_ORIGINS = [
    'https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app',
    'https://dorothedentallossc.com.ph',
    'https://www.dorothedentallossc.com.ph',
    'http://localhost:3000',
    'http://localhost:8000',
]

# Allow additional origins from environment variable
custom_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if custom_cors_origins:
    CORS_ALLOWED_ORIGINS.extend(custom_cors_origins.split(','))

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_PREFLIGHT_MAX_AGE = 86400  # Cache preflight requests for 24 hours

# Allow media files to be embedded in iframes
X_FRAME_OPTIONS = 'SAMEORIGIN'

# CSRF Settings for Railway deployment
CSRF_TRUSTED_ORIGINS = [
    'https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app',
    'https://dorothedentallossc.com.ph',
    'https://www.dorothedentallossc.com.ph',
    'http://localhost:3000',
    'http://localhost:8000',
]

# Add any custom domains from environment variable
custom_origins = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if custom_origins:
    CSRF_TRUSTED_ORIGINS.extend(custom_origins.split(','))

# More permissive CSRF settings for development
CSRF_COOKIE_HTTPONLY = False
CSRF_USE_SESSIONS = False
CSRF_COOKIE_SAMESITE = 'Lax'

# Security settings for production
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = False  # Railway handles this
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    # Development settings
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False

# ============================================
# EMAIL CONFIGURATION
# ============================================

# Email Backend Selection
# For development: Use console or Mailtrap
# For production: Use Resend API (HTTPS - works on Railway)
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend'  # Prints emails to console
)

# Resend API Configuration (for Railway - bypasses blocked SMTP)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')

# SMTP Configuration (for platforms that allow SMTP)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'False') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

# Default sender email
DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL',
    'Dorotheo Dental Clinic <onboarding@resend.dev>'
)
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Frontend URL for password reset links and other frontend redirects
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Email timeout (seconds)
EMAIL_TIMEOUT = 10

# ============================================
# AUDIT LOGGING CONFIGURATION
# ============================================

# Enable/disable audit middleware globally
AUDIT_MIDDLEWARE_ENABLED = os.environ.get('AUDIT_MIDDLEWARE_ENABLED', 'True') == 'True'

# Enable async logging (requires Celery - implement in Task 4.8)
AUDIT_ASYNC_LOGGING = os.environ.get('AUDIT_ASYNC_LOGGING', 'False') == 'True'

# Audit log retention period (days) - 6 years for HIPAA compliance
AUDIT_LOG_RETENTION_DAYS = int(os.environ.get('AUDIT_LOG_RETENTION_DAYS', str(365 * 6)))

# Rate limiting (logs per user per minute)
AUDIT_MAX_LOGS_PER_MINUTE = int(os.environ.get('AUDIT_MAX_LOGS_PER_MINUTE', '100'))

# Paths to exclude from middleware logging
AUDIT_SKIP_PATHS = [
    '/api/login/',
    '/api/logout/',
    '/api/health/',
    '/admin/',
    '/static/',
    '/media/',
]

# ============================================
# SESSION CONFIGURATION
# ============================================

# Session timeout - 15 minutes
SESSION_COOKIE_AGE = 900  # 15 minutes in seconds
SESSION_SAVE_EVERY_REQUEST = True  # Reset session timer on every request
SESSION_EXPIRE_AT_BROWSER_CLOSE = True  # Clear session on browser close
