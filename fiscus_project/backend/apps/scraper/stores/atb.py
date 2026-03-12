import asyncio
import logging
from bs4 import BeautifulSoup
from asgiref.sync import async_to_sync

from apps.scraper.services import ingest_scraped_data
from .factory import register
from .client import UniversalScraperClient

logger = logging.getLogger(__name__)

BASE_URL = "https://www.atbmarket.com"

# ─── Category URL → human-readable category name mapping ───
CATEGORY_MAP = {
    # Акції / Економ / Новинки
    "/catalog/economy": "Економ",
    "/catalog/novetly": "Новинки",
    "/catalog/388-aktsiya-7-dniv": "Акції",
    # Овочі та фрукти
    "/catalog/287-ovochi-ta-frukti": "Овочі та фрукти",
    "/catalog/446-gorikhi-sukhofrukti": "Горіхи та сухофрукти",
    "/catalog/298-gribi": "Овочі та фрукти",
    "/catalog/390-zelen": "Овочі та фрукти",
    "/catalog/289-ovochi": "Овочі та фрукти",
    "/catalog/468-solinnya-salati": "Овочі та фрукти",
    "/catalog/288-frukti-yagodi": "Овочі та фрукти",
    # Бакалія
    "/catalog/285-bakaliya": "Бакалія",
    "/catalog/341-boroshno": "Бакалія",
    "/catalog/444-buterbrodni-masla-zakuski-pasti": "Бакалія",
    "/catalog/dzem-pasta-med": "Бакалія",
    "/catalog/371-diabetichna-ta-dietichna-produktsiya": "Бакалія",
    "/catalog/iza-svidkogo-prigotuvanna": "Бакалія",
    "/catalog/395-krupi": "Бакалія",
    "/catalog/masni-ta-ribni-konservi": "Бакалія",
    "/catalog/431-mayonez": "Бакалія",
    "/catalog/348-makaronni-virobi": "Бакалія",
    "/catalog/ovoceva-ta-fruktova-konservacia": "Бакалія",
    "/catalog/olia-ta-ocet": "Бакалія",
    "/catalog/305-pripravi-ta-marinadi": "Бакалія",
    "/catalog/365-sousi-ketchupi": "Бакалія",
    "/catalog/378-sukhi-snidanki": "Бакалія",
    "/catalog/306-tovari-dlya-vipichki": "Бакалія",
    "/catalog/312-tsukor": "Бакалія",
    # Молочні продукти та яйця
    "/catalog/molocni-produkti-ta-ajca": "Молочні продукти",
    "/catalog/399-vershki": "Молочні продукти",
    "/catalog/422-dityacha-molochna-produktsiya": "Молочні продукти",
    "/catalog/zgusene-moloko": "Молочні продукти",
    "/catalog/349-yogurti": "Молочні продукти",
    "/catalog/316-kislomolochni-napoi": "Молочні продукти",
    "/catalog/414-maslo-i-margarin": "Молочні продукти",
    "/catalog/398-moloko": "Молочні продукти",
    "/catalog/382-molochni-deserti": "Молочні продукти",
    "/catalog/379-sir-kislomolochniy": "Молочні продукти",
    "/catalog/317-sirki-glazurovani": "Молочні продукти",
    "/catalog/380-sirki-dityachi": "Молочні продукти",
    "/catalog/329-smetana": "Молочні продукти",
    "/catalog/381-yaytsya-kuryachi-perepelini": "Молочні продукти",
    # Алкоголь
    "/catalog/292-alkogol-i-tyutyun": "Алкоголь",
    "/catalog/vermut": "Алкоголь",
    "/catalog/320-vino": "Алкоголь",
    "/catalog/296-gorilka": "Алкоголь",
    "/catalog/igriste-vino": "Алкоголь",
    "/catalog/336-inshiy-alkogol": "Алкоголь",
    "/catalog/350-kon-yak": "Алкоголь",
    "/catalog/337-likeri-nastoyanki-bal-zami": "Алкоголь",
    "/catalog/310-pivo": "Алкоголь",
    "/catalog/slaboalkogolni-napoi": "Алкоголь",
    # Напої безалкогольні
    "/catalog/294-napoi-bezalkogol-ni": "Напої",
    "/catalog/364-yenergetichni": "Напої",
    "/catalog/kvas": "Напої",
    "/catalog/mineralna-i-pitna-voda": "Напої",
    "/catalog/307-napoi": "Напої",
    "/catalog/324-soki-nektari": "Напої",
    # М'ясо
    "/catalog/maso": "М'ясо",
    "/catalog/421-m-yasni-napivfabrikati": "М'ясо",
    "/catalog/344-m-yaso-okholodzhene": "М'ясо",
    # Сири
    "/catalog/siri": "Сири",
    "/catalog/402-siri-m-yaki": "Сири",
    "/catalog/439-siri-plavleni": "Сири",
    "/catalog/433-siri-tverdi": "Сири",
    # Кондитерські вироби
    "/catalog/299-konditers-ki-virobi": "Кондитерські вироби",
    "/catalog/327-batonchiki": "Кондитерські вироби",
    "/catalog/biskviti-ta-deserti": "Кондитерські вироби",
    "/catalog/338-vafli": "Кондитерські вироби",
    "/catalog/490-drazhe": "Кондитерські вироби",
    "/catalog/301-zhuval-ni-gumki": "Кондитерські вироби",
    "/catalog/409-krekeri": "Кондитерські вироби",
    "/catalog/kruasani-ta-zefir": "Кондитерські вироби",
    "/catalog/pasti-sokoladno-gorihovi": "Кондитерські вироби",
    "/catalog/pecivo-praniki": "Кондитерські вироби",
    "/catalog/300-skhidni-solodoshchi": "Кондитерські вироби",
    "/catalog/351-torti-i-tistechka": "Кондитерські вироби",
    "/catalog/321-tsukerki": "Кондитерські вироби",
    "/catalog/303-shokolad": "Кондитерські вироби",
    # Риба та морепродукти
    "/catalog/353-riba-i-moreprodukti": "Риба та морепродукти",
    "/catalog/ikra-ta-ribna-pasta": "Риба та морепродукти",
    "/catalog/406-krabovi-palichki": "Риба та морепродукти",
    "/catalog/moreprodukti": "Риба та морепродукти",
    "/catalog/440-preservi": "Риба та морепродукти",
    "/catalog/riba": "Риба та морепродукти",
    "/catalog/441-ribna-narizka": "Риба та морепродукти",
    # Хлібобулочні
    "/catalog/325-khlibobulochni-virobi": "Хліб та випічка",
    "/catalog/333-baton": "Хліб та випічка",
    "/catalog/326-bulochni-listkovi-virobi": "Хліб та випічка",
    "/catalog/397-lavash": "Хліб та випічка",
    "/catalog/suska-ta-suhari": "Хліб та випічка",
    "/catalog/331-khlib": "Хліб та випічка",
    "/catalog/347-khlibtsi": "Хліб та випічка",
    # Заморожені продукти
    "/catalog/322-zamorozheni-produkti": "Заморожені продукти",
    "/catalog/356-vareniki-pel-meni-mlintsi": "Заморожені продукти",
    "/catalog/334-morozivo": "Заморожені продукти",
    "/catalog/457-napivfabrikati": "Заморожені продукти",
    "/catalog/452-ovochi-ta-frukti-svizhozamorozheni": "Заморожені продукти",
    "/catalog/430-tisto-vipichka-pitsa": "Заморожені продукти",
    # Кава та чай
    "/catalog/kava-caj": "Кава та чай",
    "/catalog/286-kava-kakao": "Кава та чай",
    "/catalog/318-chay": "Кава та чай",
    # Чіпси та снеки
    "/catalog/cipsi-sneki": "Чіпси та снеки",
    "/catalog/sneki": "Чіпси та снеки",
    "/catalog/cipsi": "Чіпси та снеки",
    # Ковбаса
    "/catalog/360-kovbasa-i-m-yasni-delikatesi": "Ковбаса та делікатеси",
    "/catalog/408-inshi-m-yasni-virobi": "Ковбаса та делікатеси",
    "/catalog/kovbasa": "Ковбаса та делікатеси",
    "/catalog/narizki-ta-delikatesi": "Ковбаса та делікатеси",
    "/catalog/377-sosiski-sardel-ki": "Ковбаса та делікатеси",
    # Дитяче харчування
    "/catalog/339-dityache-kharchuvannya": "Дитяче харчування",
    "/catalog/367-voda": "Дитяче харчування",
    "/catalog/418-dityache-pechivo": "Дитяче харчування",
    "/catalog/386-kashi": "Дитяче харчування",
    "/catalog/366-molochni-sumishi": "Дитяче харчування",
    "/catalog/340-pyure": "Дитяче харчування",
    "/catalog/368-soki-chay": "Дитяче харчування",
    # Японська кухня
    "/catalog/415-yapons-ka-kukhnya": "Японська кухня",
    "/catalog/416-vasabi-imbir-otset": "Японська кухня",
    "/catalog/464-nori-i-panirovka": "Японська кухня",
    # Кулінарія
    "/catalog/502-kulinariya": "Кулінарія",
    "/catalog/503-buterbrodi-burgeri": "Кулінарія",
    "/catalog/489-drugi-stravi": "Кулінарія",
    "/catalog/pica": "Кулінарія",
    # Товари для дітей
    "/catalog/373-tovari-dlya-ditey": "Товари для дітей",
    "/catalog/374-pidguzki-pelyushki": "Товари для дітей",
    "/catalog/450-servetki-vologi": "Товари для дітей",
    # Побутова хімія
    "/catalog/308-pobutova-khimiya-ta-neprodovol-chi-tovari": "Побутова хімія",
    "/catalog/313-zasobi-dlya-mittya-posudu": "Побутова хімія",
    "/catalog/zasobi-dla-cisenna": "Побутова хімія",
    "/catalog/309-osvizhuvachi-povitrya": "Побутова хімія",
    "/catalog/314-pral-ni-poroshki-ta-zasobi-dlya-prannya": "Побутова хімія",
    # Гігієна та косметика
    "/catalog/290-gigiena-i-kosmetika": "Гігієна та косметика",
    "/catalog/473-vatni-palichki-diski": "Гігієна та косметика",
    "/catalog/geli-dla-dusu": "Гігієна та косметика",
    "/catalog/gigiena-rotovoi-poroznini": "Гігієна та косметика",
    "/catalog/311-gigienichni-prokladki-tamponi": "Гігієна та косметика",
    "/catalog/335-dezodoranti": "Гігієна та косметика",
    "/catalog/doglad-za-volossam": "Гігієна та косметика",
    "/catalog/387-doglyad-za-tilom": "Гігієна та косметика",
    "/catalog/302-zasobi-dlya-golinnya": "Гігієна та косметика",
    "/catalog/milo": "Гігієна та косметика",
    "/catalog/372-pidguzki-dlya-doroslikh": "Гігієна та косметика",
    "/catalog/376-prezervativi": "Гігієна та косметика",
    "/catalog/423-servetki-rushniki": "Гігієна та косметика",
    "/catalog/291-tualetniy-papir": "Гігієна та косметика",
    "/catalog/345-shampuni": "Гігієна та косметика",
    # Товари для дому
    "/catalog/358-tovari-dlya-domu": "Товари для дому",
    "/catalog/383-batareyki": "Товари для дому",
    "/catalog/359-yelektrolampi": "Товари для дому",
    "/catalog/370-zasobi-po-doglyadu-za-vzuttyam": "Товари для дому",
    "/catalog/474-kantstovari": "Товари для дому",
    "/catalog/458-kolgoti-gol-fi-shkarpetki": "Товари для дому",
    "/catalog/384-medikamenti": "Товари для дому",
    "/catalog/369-odnorazoviy-posud": "Товари для дому",
    "/catalog/375-paketi-dlya-pokupok": "Товари для дому",
    "/catalog/455-paketi-dlya-smittya": "Товари для дому",
    "/catalog/363-sirniki-zapal-nichki": "Товари для дому",
    "/catalog/420-tovari-dlya-vipichki-i-upakovki-izhi": "Товари для дому",
    "/catalog/394-tovari-dlya-kukhni": "Товари для дому",
    "/catalog/392-tovari-dlya-pribirannya": "Товари для дому",
    # Товари для тварин
    "/catalog/436-tovari-dlya-tvarin": "Товари для тварин",
    "/catalog/437-korm": "Товари для тварин",
    "/catalog/449-napovnyuvach": "Товари для тварин",
    # Тютюнові вироби
    "/catalog/479-tyutyunovi-virobi": "Тютюнові вироби",
    "/catalog/sigareti": "Тютюнові вироби",
    "/catalog/stiki-ta-elektronni-sigareti": "Тютюнові вироби",
    # Канцелярія
    "/catalog/389-kantselyars-ki-tovari": "Канцелярія",
    "/catalog/475-dopomizhne-priladdya": "Канцелярія",
    "/catalog/445-zoshiti-al-bomi-bloknoti": "Канцелярія",
    "/catalog/477-kantselyars-ki-nabori": "Канцелярія",
    "/catalog/407-papki-fayli-obkladinki": "Канцелярія",
    "/catalog/483-ruchki-olivtsi-flomasteri": "Канцелярія",
    "/catalog/453-farbi-plastilin-kley": "Канцелярія",
}

CATALOG_CATEGORIES = list(CATEGORY_MAP.keys())

# ─── Concurrency settings ───
MAX_CONCURRENT_CATEGORIES = 5   
MAX_CONCURRENT_PAGES = 5        
MAX_PAGES_PER_CATEGORY = 20


@register('atb')
class ATBScraper:
    CHAIN_NAME = 'АТБ'
    CHAIN_SLUG = 'atb'

    def __init__(self, shop_id: str = "1"):
        self.shop_id = shop_id
        self.CATALOG_CATEGORIES = CATALOG_CATEGORIES

    def close(self):
        """Called by main.py after scraping — no-op since session is managed async."""
        pass

    def start(self):
        """Wrapper for celery / sync callers."""
        self.scrape()

    def scrape(self):
        """Sync entry-point — запускає async runner."""
        all_products = async_to_sync(self._run)()

        if not all_products:
            print(f"[{self.CHAIN_NAME}] Немає товарів для збереження.")
            return

        print(f"[{self.CHAIN_NAME}] Зберігаю {len(all_products)} товарів у БД...")
        try:
            shop_id_int = int(str(self.shop_id).strip())
        except ValueError:
            shop_id_int = 1
        ingest_scraped_data(all_products, self.CHAIN_SLUG, shop_id_int)
        print(f"[{self.CHAIN_NAME}] ✓ Збережено!")

    async def _run(self):
        all_products = []
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_CATEGORIES)
        
        # Ініціалізуємо розумний клієнт (10 з'єднань максимум, затримка 0.5-1.5с)
        client = UniversalScraperClient(
            max_concurrent_requests=10,
            min_jitter=0.5,
            max_jitter=1.5,
            max_retries=3,
        )

        print(f"[{self.CHAIN_NAME}] Початок збору даних (async). Магазин ID: {self.shop_id}")
        print(f"[{self.CHAIN_NAME}] Категорій: {len(self.CATALOG_CATEGORIES)} | Паралельно: {MAX_CONCURRENT_CATEGORIES}")

        tasks = [
            self._scrape_category(client, semaphore, cat)
            for cat in self.CATALOG_CATEGORIES
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for r in results:
            if isinstance(r, list):
                all_products.extend(r)
            elif isinstance(r, Exception):
                logger.warning(f"Category error: {r}")

        # Deduplicate by external_store_id
        seen = set()
        unique = []
        for p in all_products:
            key = p.get('external_store_id')
            if key and key not in seen:
                seen.add(key)
                unique.append(p)

        print(f"\n[{self.CHAIN_NAME}] Зібрано унікальних товарів: {len(unique)}")
        return unique

    async def _scrape_category(self, client: UniversalScraperClient, semaphore: asyncio.Semaphore, category_path: str) -> list:
        """Scrape all pages of a category concurrently."""
        async with semaphore:
            category_name = CATEGORY_MAP.get(category_path, '')
            products = []

            # Fetch page 1 first to know if there are more pages
            page1_products, has_more = await self._fetch_page(client, category_path, 1, category_name)
            products.extend(page1_products)

            if not page1_products:
                return products

            print(f"  ✓ {category_path} [{category_name}] — стор.1: {len(page1_products)} товарів")

            if has_more:
                # Fetch remaining pages concurrently
                page_sem = asyncio.Semaphore(MAX_CONCURRENT_PAGES)
                page_tasks = [
                    self._fetch_page_limited(client, page_sem, category_path, p, category_name)
                    for p in range(2, MAX_PAGES_PER_CATEGORY + 1)
                ]
                page_results = await asyncio.gather(*page_tasks, return_exceptions=True)

                for r in page_results:
                    if isinstance(r, tuple):
                        page_products, _ = r
                        if not page_products:
                            break
                        products.extend(page_products)
                    elif isinstance(r, Exception):
                        logger.warning(f"Page error in {category_path}: {r}")

            return products

    async def _fetch_page_limited(self, client, semaphore, category_path, page, category_name):
        async with semaphore:
            return await self._fetch_page(client, category_path, page, category_name)

    async def _fetch_page(self, client: UniversalScraperClient, category_path: str, page: int, category_name: str):
        """Fetch and parse a single page using smart client. Returns (products, has_next_page)."""
        url = f"{BASE_URL}{category_path}?page={page}"

        response = await client.fetch(url)
        
        if not response or response.status_code != 200:
            return [], False

        try:
            soup = BeautifulSoup(response.text, 'lxml')
            items = soup.select('article.catalog-item.js-product-container')

            if not items:
                return [], False

            products = []
            for item in items:
                product = self._parse_item(item, category_name)
                if product:
                    products.append(product)

            next_link = soup.select_one('a.product-pagination__link')
            has_next = next_link is not None and 'disabled' not in next_link.get('class', [])
            return products, has_next

        except Exception as e:
            logger.warning(f"Error parsing ATB page {url}: {e}")
            return [], False


    def _parse_item(self, item, category_name: str = '') -> dict:
        title_elem = item.select_one(".catalog-item__title a")
        title = title_elem.get_text(strip=True) if title_elem else "Unknown"

        product_id = item.get("data-product-id")
        if not product_id:
            product_id = title_elem.get("href") if title_elem else title

        price_elem = item.select_one("data.product-price__top")
        current_price = price_elem.get("value", "0") if price_elem else "0"

        old_price_elem = item.select_one("data.product-price__bottom")
        old_price = old_price_elem.get("value") if old_price_elem else None

        img_elem = item.select_one("img.catalog-item__img") or item.select_one(".catalog-item__photo img")
        image_url = (img_elem.get("src", "") or img_elem.get("data-src", "")) if img_elem else ""
        if image_url and not image_url.startswith("http"):
            image_url = f"{BASE_URL}{image_url}"

        desc_elem = item.select_one(".catalog-item__info") or item.select_one(".catalog-item__weight")
        description = desc_elem.get_text(strip=True) if desc_elem else ""

        try:
            price_val = float(current_price)
        except (ValueError, TypeError):
            price_val = 0.0

        if price_val <= 0:
            return None

        return {
            "external_store_id": str(product_id),
            "title": title,
            "image_url": image_url,
            "price": price_val,
            "old_price": float(old_price) if old_price else None,
            "description": description,
            "category": category_name,
            "is_sale": old_price is not None,
            "in_stock": True,
        }
