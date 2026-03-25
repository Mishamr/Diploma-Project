"""
Management command to seed initial store/chain data.
"""

from apps.core.models import Chain, Store
from django.core.management.base import BaseCommand

CHAINS_DATA = [
    {
        'name': 'АТБ', 'slug': 'atb', 'scraper_type': 'light',
        'website': 'https://www.atbmarket.com',
        'stores': [
            {'name': 'АТБ №1', 'city': 'Київ', 'address': 'вул. Хрещатик, 1', 'lat': 50.4501, 'lon': 30.5234},
            {'name': 'АТБ №2', 'city': 'Київ', 'address': 'пр. Перемоги, 50', 'lat': 50.4563, 'lon': 30.4389},
        ],
    },
    {
        'name': 'Сільпо', 'slug': 'silpo', 'scraper_type': 'light',
        'website': 'https://silpo.ua',
        'stores': [
            {'name': 'Сільпо №1', 'city': 'Київ', 'address': 'вул. Саксаганського, 33', 'lat': 50.4388, 'lon': 30.5100},
            {'name': 'Сільпо №2', 'city': 'Київ', 'address': 'вул. Велика Васильківська, 72', 'lat': 50.4294, 'lon': 30.5170},
        ],
    },
    {
        'name': 'Ашан', 'slug': 'auchan', 'scraper_type': 'light',
        'website': 'https://auchan.ua',
        'stores': [
            {'name': 'Ашан Рів Гош', 'city': 'Київ', 'address': 'просп. Степана Бандери, 36', 'lat': 50.4882, 'lon': 30.4987},
        ],
    },
    {
        'name': 'Метро', 'slug': 'metro', 'scraper_type': 'light',
        'website': 'https://metro.zakaz.ua',
        'stores': [
            {'name': 'Метро Теремки', 'city': 'Київ', 'address': 'просп. Академіка Глушкова, 13', 'lat': 50.3805, 'lon': 30.4631},
        ],
    },
    {
        'name': 'Новус', 'slug': 'novus', 'scraper_type': 'light',
        'website': 'https://novus.online',
        'stores': [
            {'name': 'Новус №1', 'city': 'Київ', 'address': 'вул. Драгоманова, 2', 'lat': 50.4106, 'lon': 30.6368},
        ],
    },
    {
        'name': 'Варус', 'slug': 'varus', 'scraper_type': 'light',
        'website': 'https://varus.ua',
        'stores': [
            {'name': 'Варус №1', 'city': 'Дніпро', 'address': 'вул. Січеславська Набережна, 29', 'lat': 48.4647, 'lon': 35.0462},
        ],
    },
    {
        'name': 'Фора', 'slug': 'fora', 'scraper_type': 'light',
        'website': 'https://fora.ua',
        'stores': [
            {'name': 'Фора №1', 'city': 'Київ', 'address': 'вул. Ревуцького, 18', 'lat': 50.3960, 'lon': 30.6231},
        ],
    },
    {
        'name': 'Еко Маркет', 'slug': 'eko', 'scraper_type': 'light',
        'website': 'https://eko.com.ua',
        'stores': [
            {'name': 'Еко Маркет №1', 'city': 'Київ', 'address': 'вул. Бориспільська, 9', 'lat': 50.4214, 'lon': 30.6270},
        ],
    },
    {
        'name': 'Велмарт', 'slug': 'velmart', 'scraper_type': 'light',
        'website': 'https://velmart.ua',
        'stores': [
            {'name': 'Велмарт №1', 'city': 'Вінниця', 'address': 'вул. 600-річчя, 17', 'lat': 49.2331, 'lon': 28.4682},
        ],
    },
    {
        'name': 'Таврія В', 'slug': 'tavriav', 'scraper_type': 'light',
        'website': 'https://tavriav.ua',
        'stores': [
            {'name': 'Таврія В №1', 'city': 'Одеса', 'address': 'вул. Космонавтів, 32', 'lat': 46.4251, 'lon': 30.7487},
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed initial chains and stores'

    def handle(self, *args, **options):
        created_chains = 0
        created_stores = 0

        for chain_data in CHAINS_DATA:
            chain, created = Chain.objects.get_or_create(
                slug=chain_data['slug'],
                defaults={
                    'name': chain_data['name'],
                    'scraper_type': chain_data['scraper_type'],
                    'website': chain_data.get('website', ''),
                },
            )
            if created:
                created_chains += 1
                self.stdout.write(f"  ✅ Chain: {chain.name}")

            for store_data in chain_data.get('stores', []):
                _, s_created = Store.objects.get_or_create(
                    chain=chain,
                    name=store_data['name'],
                    defaults={
                        'city': store_data.get('city', 'Київ'),
                        'address': store_data.get('address', ''),
                        'latitude': store_data.get('lat', 0.0),
                        'longitude': store_data.get('lon', 0.0),
                    },
                )
                if s_created:
                    created_stores += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nSeeded {created_chains} chains and {created_stores} stores."
        ))
