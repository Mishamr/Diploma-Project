import asyncio
import json
from curl_cffi.requests import AsyncSession

# Minimal standalone script to verify Silpo data
BASE_URL = "https://sf-ecom-api.silpo.ua"
BRANCH_ID = "1edb6b13-defd-6bb8-a1c4-87d073549907"  # Kyiv
CATEGORY_SLUG = "molochni-produkty-ta-iaitsia-234"  # "Молочні продукти та яйця"

async def test_scrape():
    print(f"[*] Testing Silpo scrape for category: {CATEGORY_SLUG}")
    url = f"{BASE_URL}/v1/uk/branches/{BRANCH_ID}/products"
    params = {
        "limit": 20,
        "offset": 0,
        "category": CATEGORY_SLUG,
        "deliveryType": "DeliveryHome",
        "includeChildCategories": "true",
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) applewebkit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    }

    async with AsyncSession(impersonate="chrome124") as session:
        resp = await session.get(url, params=params, headers=headers)
        if resp.status_code != 200:
            print(f"[!] Error: {resp.status_code}")
            return

        data = resp.json()
        items = data.get("items", [])
        
        results = []
        for item in items:
            title = item.get("title")
            price = item.get("displayPrice")
            icon = item.get("icon")
            
            # Construct image URL using our logic
            img_path = icon if (icon and icon.endswith(".webp")) else f"{icon}.webp" if icon else ""
            img_url = f"https://content.silpo.ua/tera/large/webp/{img_path}" if img_path else ""
            
            results.append({
                "title": title,
                "price": price,
                "image_url": img_url,
                "silpo_id": item.get("id")
            })

        output_file = "silpo_test_results.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"[OK] Scraped {len(results)} items. Results saved to {output_file}")
        for i, res in enumerate(results[:5]):
            print(f"{i+1}. {res['title']} - {res['price']} uah")

if __name__ == "__main__":
    asyncio.run(test_scrape())
