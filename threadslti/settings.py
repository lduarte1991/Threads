"""
Django settings for threadslti project.

Generated by 'django-admin startproject' using Django 1.9.8.

For more information on this file, see
https://docs.djangoproject.com/en/1.9/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.9/ref/settings/
"""

import os
from secure import SECURE_SETTINGS
# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.9/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = SECURE_SETTINGS['django_secret_key']  # 'c1p*$b=$a-7580-z7335dv%k24j-$)873-7qmx79a-f@d0e*#)'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True


ALLOWED_HOSTS = [
    'threads.harvardx.harvard.edu',
    '0.0.0.0',
    'localhost',
    '127.0.0.1'
]


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'ws4redis',
    'lti',
    'threads'
]

MIDDLEWARE_CLASSES = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'threadslti.middleware.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'threadslti.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'temp')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'ws4redis.context_processors.default',
            ],
            'debug': True
        },
    },
]

WSGI_APPLICATION = 'threadslti.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.9/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': SECURE_SETTINGS.get('db_default_name', 'threads'),
        'USER': SECURE_SETTINGS.get('db_default_user', 'threads'),
        'PASSWORD': SECURE_SETTINGS.get('db_default_password'),
        'HOST': SECURE_SETTINGS.get('db_default_host', 'localhost'),
        'PORT': SECURE_SETTINGS.get('db_default_port', '5432'),
    }
}

# CHANNEL_LAYERS = {
#     "default": {
#         "BACKEND": "asgi_ipc.IPCChannelLayer",
#         "CONFIG": {
#             "prefix": 'threadslti'
#             # "hosts": [os.environ.get('REDIS_URL', 'rediss://localhost:6379')],
#             # "symmetric_encryption_keys": [SECURE_SETTINGS['django_secret_key']],
#         },
#         "ROUTING": "threadslti.routing.channel_routing",
#     },
# }

WEBSOCKET_URL = '/ws/'
WS4REDIS_EXPIRE = 5
WS4REDIS_PREFIX = 'ws'
WS4REDIS_CONNECTION = {
    'host': 'localhost',
    'port': 6379
}

# Password validation
# https://docs.djangoproject.com/en/1.9/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/1.9/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.9/howto/static-files/
# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.7/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'http_static/')

STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]

PROJECT_APPS = (
    'lti'
)

LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'propagate': True,
            'level': 'DEBUG',
        }
    },
}

LTI_COURSE_ID = "context_id"
LTI_COLLECTION_ID = "custom_collection_id"
LTI_OBJECT_ID = "custom_object_id"
LTI_ROLES = "roles"
LTI_DEBUG = SECURE_SETTINGS.get('debug', False)
CONSUMER_URL = SECURE_SETTINGS.get('CONSUMER_URL')
ADMIN_ROLES = SECURE_SETTINGS.get('ADMIN_ROLES', {'Administrator'})
X_FRAME_ALLOWED_SITES = SECURE_SETTINGS.get('X_FRAME_ALLOWED_SITES')
X_FRAME_ALLOWED_SITES_MAP = SECURE_SETTINGS.get('X_FRAME_ALLOWED_SITES_MAP')
SERVER_NAME = SECURE_SETTINGS.get('SERVER_NAME')
ORGANIZATION = SECURE_SETTINGS.get('ORGANIZATION')
LTI_SECRET = SECURE_SETTINGS['LTI_SECRET']  # ignored if using django_auth_lti
LTI_SECRET_DICT = SECURE_SETTINGS['LTI_SECRET_DICT']
CONSUMER_KEY = SECURE_SETTINGS['CONSUMER_KEY']
WS4REDIS_HEARTBEAT = '--heartbeat--'
