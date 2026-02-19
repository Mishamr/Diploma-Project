# 🏗️ Fiscus - Архітектура системи та `external_store_id`

## 📋 Зміни, які були внесені

### 1. **Модель `Store` (apps/core/models.py)**

**Було:**
```python
class Store(models.Model):
    name = models.CharField(max_length=100)
    url_base = models.URLField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
```

**Стало:**
```python
class Store(models.Model):
    chain_name = models.CharField(max_length=100)  # АТБ, Сільпо, Ашан
    address = models.CharField(max_length=255)      # Специфічна локація
    external_store_id = models.CharField(max_length=100, unique=True)  # ID від рітейлера
    url_base = models.URLField()                    # Базовий URL ланцюга
    latitude = models.FloatField()
    longitude = models.FloatField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ("chain_name", "address")
```

**Ключові відмінності:**
- `external_store_id` — унікальний ID, який **рітейлер використовує** для ідентифікації свого магазину
- `address` розрізняє **фізичні локації** одного ланцюга (АТБ на Городоцькій vs АТБ на Сихові)
- `chain_name` — назва ланцюга (АТБ, Сільпо, Ашан), а не унікальна назва локації

**Приклад бази даних:**
```
Store ID  | chain_name  | address                    | external_store_id     | latitude | longitude
----------+-------------+----------------------------+-----------------------+----------+----------
1         | АТБ         | вул. Городоцька, 48       | atb-lviv-gorodocka    | 49.844   | 24.025
2         | АТБ         | вул. Сихів, 12            | atb-lviv-syhiv        | 49.841   | 24.030
3         | АТБ         | Пл. Ринок, 1              | atb-lviv-rynok        | 49.843   | 24.019
4         | Сільпо      | Ул. Під Дубом, 7б         | silpo-lviv-forum      | 49.849   | 24.022
5         | Auchan      | вул. Кульпарківська, 160  | auchan-lviv-sokil     | 49.773   | 24.012
```

---

### 2. **Модель `Price` (apps/core/models.py)**

**Було:**
```python
class Price(models.Model):
    product = models.ForeignKey(Product, ...)
    store_name = models.CharField(max_length=200)  # ❌ Текстова строка!
    price_value = models.DecimalField(...)
    scraped_at = models.DateTimeField(auto_now_add=True)
```

**Стало:**
```python
class Price(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    store = models.ForeignKey(Store, on_delete=models.CASCADE)  # ✅ ForeignKey на Store!
    price_value = models.DecimalField(...)
    in_stock = models.BooleanField(default=True)
    scraped_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['product', 'store']),
            models.Index(fields=['-scraped_at']),
        ]
```

**Чому це важливо:**
- Тепер можемо **гарантовано розрізняти** ціни для різних локацій однієї мережі
- Приклад: "Молоко Галичина" = 45 грн @ АТБ Городоцька + 44 грн @ АТБ Сихів
- SQL запит натомість `WHERE store_name = 'АТБ'` (невизначена локація) буде `WHERE store_id IN (1, 2, 3, ...)` (точна локація)

---

### 3. **Обновлені скрепери (базовий клас)**

**Базовий клас `BaseScraper`:**

**Було:**
```python
@abc.abstractmethod
def set_store_location(self, driver, store_id: str = None) -> None:
    """Set the physical store location for the scraper."""

@abc.abstractmethod
def scrape_category(self, url: str, store_id: str = None) -> List[Dict]:
    """Scrape products. Each dict has: store_id, store_name, name, price, ..."""
```

**Стало:**
```python
@abc.abstractmethod
def set_store_context(self, driver, store_metadata: dict) -> None:
    """
    CRITICAL: Set the physical store location BEFORE scraping.
    
    Args:
        driver: Selenium WebDriver
        store_metadata: {
            "external_store_id": "atb-lviv-gorodocka",
            "chain_name": "АТБ",
            "address": "вул. Городоцька, 48",
            "latitude": 49.844,
            "longitude": 24.025,
        }
    
    Implementation strategies:
    1. Via Cookies:
       driver.add_cookie({'name': 'storeId', 'value': '123'})
    
    2. Via LocalStorage (React SPA):
       driver.execute_script("localStorage.setItem('activeStore', '123');")
    
    3. Via UI Dropdown:
       - Click store selector
       - Type city/address
       - Select from dropdown
       - Confirm
    """

@abc.abstractmethod
def scrape_category(self, url: str, store_metadata: dict = None) -> List[Dict]:
    """
    Returns: [{
        "chain_name": "АТБ",
        "external_store_id": "atb-lviv-gorodocka",
        "name": "...",
        "price": 45.99,
        "in_stock": True,
        ...
    }]
    """
```

---

### 4. **Оновлені скрепери: ATB та Silpo**

#### **ATB (atb.py)**
```python
def set_store_context(self, driver, store_metadata: dict) -> None:
    """
    1. Inject cookie з external_store_id
    2. Close cookies modal
    3. Click region selector
    4. Select Lviv
    5. Select specific store from list
    6. Refresh page
    """
    external_store_id = store_metadata['external_store_id']
    address = store_metadata['address']
    
    # Inject cookie
    driver.add_cookie({
        'name': 'selectedStore',
        'value': external_store_id,
        'domain': '.atbmarket.com'
    })
    
    # Open region modal and select store...
    # (Деталі дивись у коді)
    
    driver.refresh()  # Apply context
```

#### **Silpo (silpo.py)**
```python
def set_store_context(self, driver, store_metadata: dict) -> None:
    """
    React SPA - більш простіше:
    1. Inject activeStoreId у LocalStorage
    2. Set cookie
    3. Refresh page
    """
    store_id_map = {
        "silpo-lviv-forum": "2043",
        "silpo-lviv-skymall": "2044",
    }
    numeric_id = store_id_map[store_metadata['external_store_id']]
    
    script = f"""
        localStorage.setItem('activeStoreId', '{numeric_id}');
        document.cookie = "storeId={numeric_id}; path=/; domain=.silpo.ua";
    """
    driver.execute_script(script)
    driver.refresh()
```

---

## 🎯 Як отримати `store_id` для кожного магазину у Львові?

### **Варіант 1: Автоматичне виявлення через API/DevTools (ІДЕАЛЬНО)**

#### **ATB Market**
1. Перейти на https://www.atbmarket.com
2. Відкрити DevTools (F12) → Network tab
3. Клік на "Вибрати регіон" → побачити XHR запит
4. У響應знайти `storeId` або `locationId`:
```json
{
  "stores": [
    {"id": "atb-lviv-gorodocka", "name": "Городоцька 48", "city": "Lviv"},
    {"id": "atb-lviv-syhiv", "name": "Сихів 12", "city": "Lviv"}
  ]
}
```
5. Використовувати `id` як `external_store_id`

#### **Silpo**
1. Перейти на https://silpo.ua
2. DevTools → Network tab
3. Пошук запиту `/api/stores` або `/api/delivery`:
```json
{
  "stores": [
    {"id": 2043, "name": "Forum Lviv", "address": "Під Дубом 7б"},
    {"id": 2044, "name": "Sky Mall", "address": "Богдана Хмельницького 32"}
  ]
}
```
4. Мейпити: `silpo-lviv-forum` → `2043`

#### **Auchan**
1. https://auchan.zakaz.ua
2. DevTools → Network → перейти до вибору міста
3. Знайти XHR з `city_id`, `store_code`, або подібні параметри

### **Варіант 2: Парсинг HTML-сторінки (запасний план)**

Якщо API недоступне, можна парсити dropdown або список на сайті:

```python
from selenium import webdriver
from selenium.webdriver.common.by import By

driver = webdriver.Chrome()
driver.get("https://www.atbmarket.com")

# Знайти всі опції у dropdown
store_options = driver.find_elements(By.CSS_SELECTOR, ".store-dropdown-item")

for option in store_options:
    store_id = option.get_attribute("data-store-id")  # або інший атрибут
    store_name = option.text
    print(f"{store_id}: {store_name}")

# Вивід:
# atb-lviv-gorodocka: Городоцька, 48
# atb-lviv-syhiv: Сихів, 12
```

### **Варіант 3: Ручний Маппінг (оновлювати періодично)**

Дивись `seed_lviv_stores.py` у проекті — вже готовий маппінг для основних магазинів:

```python
STORES_DATA = [
    {
        "chain_name": "АТБ",
        "address": "вул. Городоцька, 48",
        "external_store_id": "atb-lviv-gorodocka",  # ← ТУТ ID
        "url_base": "https://atbmarket.com",
        "latitude": 49.844,
        "longitude": 24.025,
    },
    # ...more stores
]
```

---

## 🔄 Workflow: "Користувач шукає найдешевше молоко у Львові"

```
1. Frontend: Користувач вводить "Молоко Галичина"
   ↓
2. API call: GET /api/products/search?name=Молоко&radius=2km&lat=49.84&lng=24.02
   ↓
3. Backend: SELECT * FROM Price 
            WHERE product.name LIKE '%Молоко%'
            AND store.latitude BETWEEN 49.82 AND 49.86
            AND store.longitude BETWEEN 24.00 AND 24.04
            AND scraped_at > NOW() - INTERVAL '1 day'
            ORDER BY price_value ASC
   ↓
4. Результат:
   ✓ Молоко Галичина @ АТБ (Городоцька) = 45.99 грн
   ✓ Молоко Галичина @ АТБ (Сихів) = 44.50 грн
   ✓ Молоко Галичина @ Сільпо (Forum) = 46.99 грн
   ↓
5. Frontend: Показати найдешевший варіант з навігацією до магазину
```

---

## 📊 Database Schema (ERD)

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Product    │────→│    Price    │←────│    Store     │
├─────────────┤     ├─────────────┤     ├──────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)      │
│ name        │     │ product_id  │     │ chain_name   │
│ category    │     │ store_id    │     │ address      │
│ barcode     │     │ price_value │     │ external_id ✓│
│ image_url   │     │ in_stock    │     │ url_base     │
│             │     │ scraped_at  │     │ latitude     │
│             │     │             │     │ longitude    │
└─────────────┘     └─────────────┘     └──────────────┘

Many-to-Many: Product ←[Price]→ Store
Relationship type: через посередниця модель Price
```

---

## 🚀 Як запустити?

### 1. **Створити нові store записи**
```bash
python manage.py migrate  # Create Price table with store FK
python manage.py seed_lviv_stores  # Fill with actual stores + external_store_id
```

### 2. **Запустити скрепер для однієї локації**
```python
from apps.scraper.stores.atb import ATBScraper
from apps.core.models import Store

scraper = ATBScraper()

# Отримати Store об'єкт
store = Store.objects.get(external_store_id="atb-lviv-gorodocka")

# Підготувати metadata
store_metadata = {
    "external_store_id": store.external_store_id,
    "chain_name": store.chain_name,
    "address": store.address,
    "latitude": store.latitude,
    "longitude": store.longitude,
}

# Скрепити категорію
products = scraper.scrape_category(
    url="https://www.atbmarket.com/katalog/khlib-bakaliia",
    store_metadata=store_metadata
)

# Результат:
# [
#   {
#     "chain_name": "АТБ",
#     "external_store_id": "atb-lviv-gorodocka",
#     "name": "Пшеничний хлеб",
#     "price": 12.50,
#     "in_stock": True,
#     ...
#   }
# ]
```

### 3. **Зберегти результати у базу**
```python
from apps.core.models import Product, Price, Store

for item in products:
    product, _ = Product.objects.get_or_create(name=item['name'])
    store = Store.objects.get(external_store_id=item['external_store_id'])
    
    Price.objects.create(
        product=product,
        store=store,
        price_value=item['price'],
        in_stock=item['in_stock'],
    )
```

---

## ❓ FAQ

### **Q: Як розрізняти АТБ на Городоцькій від АТБ на Сихові у базі?**
A: За `(chain_name, address)` unique_together:
- Record 1: `chain_name="АТБ", address="вул. Городоцька, 48"`
- Record 2: `chain_name="АТБ", address="вул. Сихів, 12"`

### **Q: Де береться `external_store_id`?**
A: Від рітейлера:
- **ATB**: `atb-lviv-gorodocka` (з їхнього URL або API)
- **Silpo**: Мейпимо їхній numeric ID на змістовні імена
- **Auchan**: Парсимо з HTML dropdown

### **Q: Що якщо рітейлер змінить структуру сайту?**
A: Кожен скрепер має `set_store_context()` — це критична точка. Змінюємо не SQL, а тільки логіку подбору селекторів у скрепері.

### **Q: Які опції для автоматизації обновлення цін?**
A: Celery Beat або APScheduler:
```python
# tasks.py
@shared_task
def scrape_all_stores():
    stores = Store.objects.filter(is_active=True)
    for store in stores:
        scraper = get_scraper(store.chain_name)
        scraper.scrape_category(..., store_metadata={...})
```

---

## 📝 Підсумок змін

| Компонент | Було | Стало | Чому |
|-----------|------|-------|------|
| Store.name | 1 поле | chain_name + address | Розрізняти локації |
| Store ID | не було | external_store_id | Маппити з рітейлером |
| Price.store | store_name (str) | store (FK) | Гарантована консистентність |
| Scraper API | store_id (str) | store_metadata (dict) | Передавати повний контекст |
| Scraper method | set_store_location() | set_store_context() | Ясніше, що це робити |

---

**Таким чином:**
- ✅ Система знає різницю між АТБ на різних вулицях
- ✅ Ціни прив'язані до конкретних фізичних магазинів
- ✅ Скрепери можуть правильно вибирати локацію перед парсингом
- ✅ Користувач бачить найдешевше молоко ДО якого він може дійти пішки
