"""
Management command to populate categories for existing products.
Uses the ATB scraper's CATEGORY_MAP to assign categories.
"""

from apps.core.models import Category
from django.core.management.base import BaseCommand
from django.utils.text import slugify

# Same categories as in atb.py CATEGORY_MAP
CATEGORIES = [
    "Економ",
    "Новинки",
    "Акції",
    "Овочі та фрукти",
    "Горіхи та сухофрукти",
    "Бакалія",
    "Молочні продукти",
    "Алкоголь",
    "Напої",
    "М'ясо",
    "Сири",
    "Кондитерські вироби",
    "Риба та морепродукти",
    "Хліб та випічка",
    "Заморожені продукти",
    "Кава та чай",
    "Чіпси та снеки",
    "Ковбаса та делікатеси",
    "Дитяче харчування",
    "Японська кухня",
    "Кулінарія",
    "Товари для дітей",
    "Побутова хімія",
    "Гігієна та косметика",
    "Товари для дому",
    "Товари для тварин",
    "Тютюнові вироби",
    "Канцелярія",
]


class Command(BaseCommand):
    help = "Populate categories table with ATB scraper categories"

    def handle(self, *args, **options):
        created = 0
        for name in CATEGORIES:
            slug = slugify(name, allow_unicode=True)
            if not slug:
                slug = name.lower().replace(" ", "-")
            _, was_created = Category.objects.get_or_create(
                slug=slug,
                defaults={"name": name},
            )
            if was_created:
                created += 1
                self.stdout.write(f"  ✓ {name} ({slug})")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! Created {created} categories, {len(CATEGORIES) - created} already existed."
            )
        )
