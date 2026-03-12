import asyncio
import logging
import random
from typing import Optional
from curl_cffi.requests import AsyncSession, Response

logger = logging.getLogger(__name__)

# List of valid browser impersonations for curl_cffi (mimics real TLS fingerprints)
BROWSER_PROFILES = [
    "chrome110", "chrome101"
]

class UniversalScraperClient:
    """
    Універсальний 'розумний' HTTP-клієнт для безпечного парсингу веб-сайтів.

    Відповідає за:
    1. Глобальний ліміт одночасних запитів (Semaphore).
    2. Випадкову паузу перед кожним запитом (Jitter) для імітації людини.
    3. Автоматичну підміну браузера (Impersonate).
    4. Гнучкий механізм повторних спроб (Retry) при блокуваннях (403, 429, 50X).
    """

    def __init__(
        self,
        max_concurrent_requests: int = 10,
        min_jitter: float = 0.5,
        max_jitter: float = 2.0,
        max_retries: int = 3,
        timeout: int = 20,
        proxy: str = None
    ):
        """
        Ініціалізує клієнта.
        
        Args:
            max_concurrent_requests: Максимальна кількість паралельних з'єднань
            min_jitter: Мінімальна затримка перед запитом (секунди)
            max_jitter: Максимальна затримка перед запитом (секунди)
            max_retries: Скільки разів пробувати повторити при помилці
            timeout: Максимальний час виконання одного запиту
            proxy: (Опціонально) Рядок підключення до проксі-сервера 
        """
        self.semaphore = asyncio.Semaphore(max_concurrent_requests)
        self.min_jitter = min_jitter
        self.max_jitter = max_jitter
        self.max_retries = max_retries
        self.timeout = timeout
        self.proxy = proxy
        self.proxies = {"http": proxy, "https": proxy} if proxy else None

    async def fetch(
        self, 
        url: str, 
        method: str = "GET", 
        params: dict = None, 
        headers: dict = None, 
        json_data: dict = None, 
        data=None, 
        **kwargs
    ) -> Optional[Response]:
        """
        Безпечно виконує HTTP-запит з повним анти-бан захистом.
        """
        async with self.semaphore:
            # 1. Human Jitter (Затримка як у реальної людини)
            jitter = random.uniform(self.min_jitter, self.max_jitter)
            await asyncio.sleep(jitter)

            for attempt in range(self.max_retries + 1):
                try:
                    # 2. Browser Rotation (Зміна відбитку браузера на кожен запит)
                    profile = random.choice(BROWSER_PROFILES)

                    # curl_cffi AsyncSession automatically mimics the selected profile
                    async with AsyncSession(impersonate=profile, proxies=self.proxies) as session:
                        response = await session.request(
                            method=method,
                            url=url,
                            params=params,
                            headers=headers,
                            json=json_data,
                            data=data,
                            timeout=self.timeout,
                            **kwargs
                        )

                        # Перевірка на тимчасові блоки (Rate limits / Server errors / WAF blocks)
                        if response.status_code in [403, 429, 500, 502, 503, 504]:
                            logger.warning(
                                f"[SmartClient] HTTP {response.status_code} на {url} "
                                f"(спроба {attempt + 1}/{self.max_retries + 1})"
                            )
                            if attempt < self.max_retries:
                                # Exponential backoff: чекаємо 2с, 4с, 8с...
                                backoff = (2 ** attempt) + random.uniform(0.1, 1.0)
                                await asyncio.sleep(backoff)
                                continue
                            else:
                                return response  # Повертаємо останню відповідь, навіть якщо вона з помилкою

                        # Робочі коди (200, 404 тощо) повертаємо одразу
                        return response

                except Exception as e:
                    logger.warning(
                        f"[SmartClient] Помилка на {url}: {e} "
                        f"(спроба {attempt + 1}/{self.max_retries + 1})"
                    )
                    if attempt < self.max_retries:
                        backoff = (2 ** attempt) + random.uniform(0.1, 1.0)
                        await asyncio.sleep(backoff)
                        continue
                    else:
                        return None

        return None
