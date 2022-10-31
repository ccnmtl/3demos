from mathplayground.settings import *  # noqa: F403,F401

project = 'mathplayground'
s3prefix = 'ctl'

DEBUG = False

# serve static files off S3
AWS_STORAGE_BUCKET_NAME = s3prefix + "-" + project + "-static-prod"
AWS_S3_OBJECT_PARAMETERS = {
    'ACL': 'public-read',
}
AWS_PRELOAD_METADATA = True
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'

S3_URL = 'https://%s.s3.amazonaws.com/' % AWS_STORAGE_BUCKET_NAME
STATIC_URL = ('https://%s.s3.amazonaws.com/media/' % AWS_STORAGE_BUCKET_NAME)

MEDIA_URL = S3_URL + 'uploads/'
AWS_LOCATION = 'media/'
AWS_QUERYSTRING_AUTH = False

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/' + project + '.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

try:
    from mathplayground.local_settings import *  # noqa: F403,F401
except ImportError:
    pass
