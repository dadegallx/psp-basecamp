# Poverty Stoplight - Superset Configuration
# This file configures Superset when using the official Apache Superset image.
# CSP/Talisman settings are handled by nginx, not here.

import logging
import os

from celery.schedules import crontab
from flask_caching.backends.filesystemcache import FileSystemCache

logger = logging.getLogger()

# =============================================================================
# Database Configuration (from environment)
# =============================================================================
DATABASE_DIALECT = os.getenv("DATABASE_DIALECT", "postgresql")
DATABASE_USER = os.getenv("DATABASE_USER", "superset")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "superset")
DATABASE_HOST = os.getenv("DATABASE_HOST", "db")
DATABASE_PORT = os.getenv("DATABASE_PORT", "5432")
DATABASE_DB = os.getenv("DATABASE_DB", "superset")

SQLALCHEMY_DATABASE_URI = (
    f"{DATABASE_DIALECT}://"
    f"{DATABASE_USER}:{DATABASE_PASSWORD}@"
    f"{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_DB}"
)

# Examples database (same as main for local dev)
SQLALCHEMY_EXAMPLES_URI = SQLALCHEMY_DATABASE_URI

# =============================================================================
# Secret Key (REQUIRED - generate with: openssl rand -base64 42)
# =============================================================================
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND")

# =============================================================================
# Redis & Caching
# =============================================================================
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_CELERY_DB = os.getenv("REDIS_CELERY_DB", "0")
REDIS_RESULTS_DB = os.getenv("REDIS_RESULTS_DB", "1")

RESULTS_BACKEND = FileSystemCache("/app/superset_home/sqllab")

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_HOST": REDIS_HOST,
    "CACHE_REDIS_PORT": REDIS_PORT,
    "CACHE_REDIS_DB": REDIS_RESULTS_DB,
}
DATA_CACHE_CONFIG = CACHE_CONFIG
THUMBNAIL_CACHE_CONFIG = CACHE_CONFIG

# =============================================================================
# Celery Configuration
# =============================================================================
class CeleryConfig:
    broker_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_CELERY_DB}"
    imports = (
        "superset.sql_lab",
        "superset.tasks.scheduler",
        "superset.tasks.thumbnails",
        "superset.tasks.cache",
    )
    result_backend = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_RESULTS_DB}"
    worker_prefetch_multiplier = 1
    task_acks_late = False
    beat_schedule = {
        "reports.scheduler": {
            "task": "reports.scheduler",
            "schedule": crontab(minute="*", hour="*"),
        },
        "reports.prune_log": {
            "task": "reports.prune_log",
            "schedule": crontab(minute=10, hour=0),
        },
    }


CELERY_CONFIG = CeleryConfig

# =============================================================================
# Feature Flags
# =============================================================================
FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "DASHBOARD_VIRTUALIZATION": True,
    "SQLLAB_BACKEND_PERSISTENCE": True,
}

ALERT_REPORTS_NOTIFICATION_DRY_RUN = True
SQLLAB_CTAS_NO_LIMIT = True

# =============================================================================
# Webdriver Configuration (for Alerts & Reports screenshots)
# =============================================================================
WEBDRIVER_BASEURL = "http://superset_app:8088/"
WEBDRIVER_BASEURL_USER_FRIENDLY = "http://localhost/"

# =============================================================================
# Poverty Stoplight Custom Color Scheme
# Colors: Green, Yellow, Red, Skipped, Unknown
# =============================================================================
EXTRA_CATEGORICAL_COLOR_SCHEMES = [
    {
        "id": "povertyStoplight",
        "description": "Poverty Stoplight traffic light colors",
        "label": "Poverty Stoplight",
        "isDefault": True,
        "colors": [
            "#2E7D32",  # Green
            "#F9A825",  # Yellow
            "#C62828",  # Red
            "#9E9E9E",  # Skipped
            "#616161",  # Unknown (darker grey)
        ],
    }
]

# =============================================================================
# Logging
# =============================================================================
log_level_text = os.getenv("SUPERSET_LOG_LEVEL", "INFO")
LOG_LEVEL = getattr(logging, log_level_text.upper(), logging.INFO)

# =============================================================================
# Proxy Configuration
# Enable if running behind nginx/load balancer
# =============================================================================
ENABLE_PROXY_FIX = True

# =============================================================================
# NOTE: CSP/Talisman configuration is handled by nginx, not here.
# This allows the chat widget to be injected without modifying Superset code.
# See nginx/templates/superset.conf.template for CSP headers.
# =============================================================================
