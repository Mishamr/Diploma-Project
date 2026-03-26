# Fiscus: Smart Price

Мобільний додаток для порівняння цін у продуктових магазинах України.

## Опис

Fiscus допомагає користувачам економити на продуктах:
- Порівняння цін між мережами (АТБ, Сільпо, Ашан)
- Побудова оптимального кошика виживання за бюджетом
- AI-асистент для рекомендацій з урахуванням дієтичних обмежень
- Відстеження акцій та знижок
- Карта найближчих магазинів
- Аналітика витрат та календар покупок

## Технології

### Backend
| Компонент | Технологія |
|-----------|-----------|
| Фреймворк | Django 4.2 + Django REST Framework |
| База даних | PostgreSQL 16 |
| Черга задач | Celery + Redis 7 |
| Скрапінг | requests, BeautifulSoup4, curl_cffi, Playwright |
| Матчинг | thefuzz (Levenshtein) |
| Валідація | Pydantic 2 |
| Сервер | Gunicorn |

### Frontend
| Компонент | Технологія |
|-----------|-----------|
| Фреймворк | React Native 0.73 + Expo 50 |
| Навігація | React Navigation 6 (Stack + Bottom Tabs) |
| Стан | Zustand 4 + React Context |
| Карти | react-native-maps |
| Графіки | react-native-chart-kit |
| Зберігання | AsyncStorage |

### Інфраструктура
| Компонент | Технологія |
|-----------|-----------|
| Контейнеризація | Docker Compose |
| CI/CD | GitHub Actions |
| Лінтинг | Flake8, Black, isort, Bandit |

## Швидкий старт

### Локальний запуск
```bash
.\fiscus.bat
```
Меню дозволяє запустити: backend, frontend, Docker, скрапери.

### Docker
```bash
docker-compose up --build
```
Запускає: PostgreSQL, Redis, Django (web), Celery Worker, Celery Beat.

### Тільки frontend
```bash
cd frontend
npm install
npx expo start --web
```

## Змінні середовища

### Корінь `.env`
```
POSTGRES_DB=fiscus
POSTGRES_USER=fiscus
POSTGRES_PASSWORD=fiscus_pass
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
OPENROUTER_API_KEY=sk-or-...
```

### `frontend/.env`
```
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## API Ендпоінти

| Метод | URL | Опис |
|-------|-----|------|
| POST | `/api/v1/auth/register/` | Реєстрація |
| POST | `/api/v1/auth/login/` | Авторизація |
| GET | `/api/v1/products/` | Список продуктів (пагінація, фільтри: `chain`, `category`, `search`) |
| GET | `/api/v1/products/{id}/` | Деталі продукту з цінами |
| GET | `/api/v1/products/{id}/prices/` | Історія цін |
| GET | `/api/v1/categories/` | Категорії |
| GET | `/api/v1/chains/` | Мережі магазинів |
| GET | `/api/v1/chains/{slug}/products/` | Товари мережі |
| GET/POST | `/api/v1/shopping-lists/` | CRUD списків покупок |
| GET | `/api/v1/promotions/` | Акції |
| GET | `/api/v1/survival/` | Кошик виживання |
| POST | `/api/v1/survival/substitute/` | AI-заміна товару |
| POST | `/api/v1/ai/chat/` | AI-асистент (Gemini) |
| GET | `/api/v1/geo/nearby/` | Найближчі магазини |
| GET | `/api/v1/geo/stores/` | Магазини на карті |
| POST | `/api/v1/geo/cheapest-basket/` | Найдешевший магазин для кошика |
| GET | `/api/v1/analytics/savings/` | Аналітика економії |
| GET | `/api/v1/analytics/user/` | Профіль користувача |
| POST | `/api/v1/auth/profile/store/buy/` | Купівля тікетів за монети |
| POST | `/api/v1/auth/profile/coins/` | Додати монети |

## CI/CD

GitHub Actions (`.github/workflows/main.yml`):
- **Code Quality**: Flake8, Black, isort, Bandit
- **Tests**: pytest з coverage ≥ 60%

## Скрапери

Три підтримувані мережі:

| Мережа | Файл | Тип | Кількість категорій |
|--------|------|-----|---------------------|
| АТБ | `atb.py` | HTML (requests + BS4) | ~50 |
| Сільпо | `silpo.py` | JSON API | Динамічно |
| Ашан | `auchan.py` | JSON API | Динамічно |

Конкурентність: до 10 одночасних запитів, 3 категорії паралельно, jitter між запитами для захисту від блокування.

## Моделі даних

```
Chain (мережа) → Store (магазин) → StoreItem (товар у магазині) → Price (ціна)
                                          ↑
Product (уніфікований товар) ← Category (категорія)
User → UserProfile (профіль, монети, тікети, алергії)
     → ShoppingList → ShoppingListItem
     → Purchase (покупки для аналітики)
```
