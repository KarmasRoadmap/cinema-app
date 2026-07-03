"""
Immutable audit event log.

Each row represents a single action performed by (or on behalf of) a user.
Once created, rows are never updated or deleted — the table is append-only.
"""
from django.conf import settings
from django.db import models


class AuditEvent(models.Model):
    """Append-only audit log entry."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    action = models.CharField(max_length=100, db_index=True)
    resource_type = models.CharField(max_length=100, blank=True)
    resource_id = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_event"
        ordering = ["-created_at"]
        verbose_name = "Audit Event"
        verbose_name_plural = "Audit Events"
        # Enforce immutability at the DB level:
        #   - no UPDATE allowed (nothing to update anyway — no save override needed)
        #   - no DELETE allowed at the model level

    def __str__(self):
        user_label = self.user.email if self.user else "system"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {user_label} — {self.action}"

    # ------------------------------------------------------------------
    # Prevent updates (immutable)
    # ------------------------------------------------------------------
    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise RuntimeError("AuditEvent records are immutable and cannot be updated.")
        super().save(*args, **kwargs)

    # ------------------------------------------------------------------
    # Prevent deletes
    # ------------------------------------------------------------------
    def delete(self, *args, **kwargs):
        raise RuntimeError("AuditEvent records are immutable and cannot be deleted.")
