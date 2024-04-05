"""
Django settings for mathplayground project.

Generated by 'django-admin startproject' using Django 4.1.1.

For more information on this file, see
https://docs.djangoproject.com/en/4.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.1/ref/settings/
"""

from pathlib import Path
from ctlsettings.shared import get_ec2_instance_ip

project = 'mathplayground'

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-lg(8*egrro1rtyr#9&-5nrqs^' + \
    '$(21#uwf!6&+!3fp@+==9_b3#'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# (replacing the existing ALLOWED_HOSTS in settings.py)
ALLOWED_HOSTS = [
    '.ctl.columbia.edu',
    '.stage.ctl.columbia.edu',
    '.ccnmtl.columbia.edu',
    'localhost',
    '127.0.0.1',
]

public_ip = get_ec2_instance_ip()
if public_ip:
    ALLOWED_HOSTS += [public_ip]

# Application definition

INSTALLED_APPS = [
    'channels',
    'mathplayground',
    'smoketest',
    'daphne',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_statsd',
]

MIDDLEWARE = [
    'django_statsd.middleware.GraphiteRequestTimingMiddleware',
    'django_statsd.middleware.GraphiteMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'mathplayground.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.messages.context_processors.messages',
                'gacontext.ga_processor',
            ],
        },
    },
]

WSGI_APPLICATION = 'mathplayground.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'TEST': {
            'NAME': BASE_DIR / 'db_test.sqlite3'
        }
    }
}

# Internationalization
# https://docs.djangoproject.com/en/4.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'America/New_York'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.1/howto/static-files/

STATIC_URL = 'media/'
STATICFILES_DIRS = [
    BASE_DIR / 'media',
]

# Default primary key field type
# https://docs.djangoproject.com/en/4.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

ASGI_APPLICATION = 'mathplayground.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
            'prefix': project + ':asgi',
        },
    },
}

STATIC_ROOT = '/tmp/' + project + '/static'
STATICFILES_DIRS = ['media/']
STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

STATSD_CLIENT = 'statsd.client'
STATSD_PREFIX = 'mathplayground'
STATSD_HOST = 'localhost'
STATSD_PORT = 8125

GRAPHITE_BASE = 'https://graphite.ctl.columbia.edu/render/'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379',
    }
}
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

try:
    from mathplayground.local_settings import *  # noqa: F403,F401
except ImportError:
    pass
