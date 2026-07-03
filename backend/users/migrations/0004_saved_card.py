from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0003_alter_user_groups'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='saved_card_last4',
            field=models.CharField(blank=True, default='', max_length=4),
        ),
        migrations.AddField(
            model_name='user',
            name='saved_card_holder',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
