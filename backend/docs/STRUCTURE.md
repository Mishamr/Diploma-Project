# Структура проєкту

```
fiscus_project/
├── .env                          # Змінні середовища (секрети)
├── .gitignore                    # Правила ігнорування Git
├── docker-compose.yml            # Docker: PostgreSQL, Redis, Django, Celery
├── fiscus.bat                    # Лаунчер для Windows
├── remove_bg.py                  # Утиліта для видалення фону з зображень
│
├── .github/
│   └── workflows/
│       └── main.yml              # CI/CD: Flake8, Black, isort, Bandit, pytest
│
├── backend/
│   ├── Dockerfile                # Docker-образ бекенду
│   ├── manage.py                 # Django CLI
│   ├── requirements.txt          # Python-залежності
│   │
│   ├── config/                   # Django-конфігурація
│   │   ├── __init__.py
│   │   ├── settings.py           # Налаштування проєкту
│   │   ├── urls.py               # Кореневі URL-маршрути
│   │   ├── wsgi.py               # WSGI точка входу
│   │   └── celery.py             # Конфігурація Celery
│   │
│   ├── apps/
│   │   ├── api/                  # REST API
│   │   │   ├── urls.py           # URL-маршрути API
│   │   │   ├── views.py          # Продукти, промоції, survival, AI-чат
│   │   │   ├── views_auth.py     # Реєстрація, логін, профіль
│   │   │   ├── views_chains.py   # Мережі магазинів
│   │   │   ├── views_premium.py  # Тікети, монети, PRO-підписка
│   │   │   ├── serializers.py    # DRF серіалізатори
│   │   │   ├── permissions.py    # Права доступу
│   │   │   └── monitoring.py     # Health check
│   │   │
│   │   ├── core/                 # Ядро додатку
│   │   │   ├── models.py         # Моделі: Chain, Store, Product, Price, UserProfile
│   │   │   ├── admin.py          # Django Admin
│   │   │   ├── migrations/       # Міграції БД
│   │   │   ├── management/       # Команди (seed_stores)
│   │   │   └── services/
│   │   │       ├── survival.py   # Генерація кошика виживання + AI-заміни
│   │   │       └── promotions.py # Акції та історія цін
│   │   │
│   │   ├── scraper/              # Модуль скрапінгу
│   │   │   ├── main.py           # Точка входу: run_scraper(), run_all()
│   │   │   ├── matcher.py        # Fuzzy-матчинг товарів між мережами
│   │   │   ├── services.py       # Збереження даних: ingest_scraped_data()
│   │   │   ├── schemas.py        # Pydantic-схема ScrapedProduct
│   │   │   ├── tasks.py          # Celery-задачі для скрапінгу
│   │   │   └── stores/
│   │   │       ├── factory.py    # ScraperFactory — реєстр скреперів
│   │   │       ├── client.py     # UniversalScraperClient (async HTTP)
│   │   │       ├── atb.py        # Скрапер АТБ (HTML)
│   │   │       ├── silpo.py      # Скрапер Сільпо (JSON API)
│   │   │       └── auchan.py     # Скрапер Ашан (JSON API)
│   │   │
│   │   └── geo/                  # Геолокація
│   │       ├── views.py          # Найближчі магазини, карта, дешевший кошик
│   │       ├── services.py       # Розрахунок відстаней (Haversine)
│   │       └── urls.py           # URL-маршрути геосервісу
│   │
│   ├── data/                     # Локальні дані скреперів
│   │   ├── atb_products.db       # SQLite-кеш ATB
│   │   └── jsonl/                # JSONL-файли
│   │
│   └── docs/                     # Документація
│       ├── README.md             # Головний опис проєкту
│       ├── STRUCTURE.md          # Цей файл
│       └── cron.md               # Розклад Celery-задач
│
└── frontend/
    ├── .env                      # Змінні середовища (API URL)
    ├── App.js                    # Точка входу React Native
    ├── index.js                  # Реєстрація додатку
    ├── app.json                  # Конфігурація Expo
    ├── babel.config.js           # Babel
    ├── metro.config.js           # Metro bundler
    ├── package.json              # npm-залежності
    │
    ├── assets/                   # Статичні ресурси
    │   ├── icon.png              # Іконка додатку
    │   ├── splash.png            # Splash screen
    │   ├── adaptive-icon.png     # Adaptive icon (Android)
    │   ├── favicon.png           # Favicon (Web)
    │   ├── atb_logo.png          # Логотип АТБ
    │   ├── game_basket.png       # Ігровий актив
    │   ├── game_good_product.png # Ігровий актив
    │   └── game_bad_product.png  # Ігровий актив
    │
    └── src/
        ├── api/
        │   └── client.js         # HTTP-клієнт для API
        │
        ├── components/           # Спільні компоненти
        │   ├── GlassCard.js      # Glassmorphism-картка
        │   ├── Header.js         # Верхня панель
        │   ├── Icon.js           # SVG-іконки (кросплатформний)
        │   ├── ProductCard.js    # Картка товару
        │   ├── StoreCard.js      # Картка магазину
        │   ├── StoreChip.js      # Chip-кнопка для мережі
        │   ├── SavingsChart.js   # Графік економії
        │   ├── CalendarWidget.js # Календар витрат
        │   ├── StatusBanner.js   # Банер статусу
        │   └── SkeletonLoader.js # Skeleton-анімації завантаження
        │
        ├── constants/
        │   ├── theme.js          # Кольори, шрифти, відступи
        │   ├── routes.js         # Назви маршрутів навігації
        │   └── stores.js         # Конфігурація мереж магазинів
        │
        ├── context/              # React Context
        │   ├── AuthContext.js     # Авторизація, токен
        │   ├── CartContext.js     # Кошик покупок
        │   └── SettingsContext.js # Налаштування (вигляд, бюджет)
        │
        ├── hooks/
        │   ├── index.js          # Агрегатор хуків
        │   ├── useApi.js         # Хук для API-запитів
        │   └── useLocation.js    # Хук геолокації
        │
        ├── navigation/
        │   └── AppNavigator.js   # Stack + Tab навігація
        │
        ├── screens/              # Екрани додатку
        │   ├── LoginScreen.js          # Вхід / Реєстрація
        │   ├── DashboardScreen.js      # Головна (скрапери, статистика)
        │   ├── ProductFeedScreen.js    # Стрічка товарів
        │   ├── ShoppingListScreen.js   # Списки покупок
        │   ├── SurvivalScreen.js       # Кошик виживання
        │   ├── AIAssistantScreen.js    # AI-чат (Gemini)
        │   ├── PromotionsScreen.js     # Акції та знижки
        │   ├── AnalyticsScreen.js      # Аналітика економії
        │   ├── ExpenseCalendarScreen.js # Календар витрат
        │   ├── MapScreen.js            # Карта магазинів
        │   ├── CompareCartScreen.js    # Порівняння кошика по магазинах
        │   ├── InflationScreen.js      # Інфляція
        │   ├── SettingsScreen.js       # Налаштування
        │   ├── StoreScreen.js          # Магазин тікетів
        │   ├── PaymentScreen.js        # Оплата PRO
        │   ├── AdVideoScreen.js        # Перегляд відео за монети
        │   └── MiniGameScreen.js       # Міні-гра (deprecated)
        │
        └── stores/
            └── index.js          # Zustand stores (products, categories, geo, etc.)
```
