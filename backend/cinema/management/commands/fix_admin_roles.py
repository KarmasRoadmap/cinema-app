"""Corrige el role='admin' para superusuarios existentes que tengan role='user'.

Uso: python manage.py fix_admin_roles
"""
from django.db import models
from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = "Corrige role='admin' para usuarios is_superuser o is_staff que tengan role='user'"

    def handle(self, *args, **options):
        bad_admins = User.objects.filter(
            role="user",
        ).filter(
            models.Q(is_superuser=True) | models.Q(is_staff=True)
        )

        if not bad_admins.exists():
            self.stdout.write(self.style.SUCCESS("✅ Todos los admins ya tienen role='admin'."))
            return

        emails = list(bad_admins.values_list("email", flat=True))
        count = bad_admins.update(role="admin")
        self.stdout.write(self.style.SUCCESS(
            f"✅ {count} usuario(s) corregido(s) → role='admin':\n   " +
            "\n   ".join(emails)
        ))
