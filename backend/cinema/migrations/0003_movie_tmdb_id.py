# Generated migration to add tmdb_id field to Movie model.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cinema', '0002_movie_imdb_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='movie',
            name='tmdb_id',
            field=models.IntegerField(blank=True, db_index=True, null=True),
        ),
    ]
