from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('cinema', '0003_movie_tmdb_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='total',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name='booking',
            name='discount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=8),
        ),
        migrations.AddField(
            model_name='booking',
            name='has_membership',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='seat',
            name='qr_code',
            field=models.TextField(blank=True, default=''),
        ),
    ]
