"""Vercel serverless handler for Django WSGI app."""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Auto-run migrations on cold start (Vercel serverless)
import django
django.setup()
from django.core.management import call_command
try:
    call_command('migrate', '--noinput', verbosity=0)
except Exception:
    pass  # Might fail if DB not ready, will retry next request

from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
