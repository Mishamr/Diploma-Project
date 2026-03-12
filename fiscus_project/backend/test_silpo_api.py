"""
Quick diagnostic script to test Silpo API directly.
"""
import asyncio
import json
import sys

# Add the backend to path
sys.path.insert(0, '.')

from apps.scraper.stores.client import UniversalScraperClient

BASE_URL = "https://sf-ecom-api.silpo.ua"
PRODUCTS_ENDPOINT = "/v1/uk/branches/{branch_id}/products"
BRANCH_ID = "00000000-0000-0000-0000-000000000000"

API_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
    "Origin": "https://silpo.ua",
    "Referer": "https://silpo.ua/",
}

TEST_CATEGORIES = ["moloko", "khlib", "ovochi", "frukty", "bakaliia"]

async def test_api():
    client = UniversalScraperClient(
        max_concurrent_requests=1,
        min_jitter=0.5,
        max_jitter=1.0,
        max_retries=2,
    )
    
    url = BASE_URL + PRODUCTS_ENDPOINT.format(branch_id=BRANCH_ID)
    print(f"URL: {url}")
    print(f"Testing {len(TEST_CATEGORIES)} categories...\n")
    
    for slug in TEST_CATEGORIES:
        params = {
            "limit": 5,
            "offset": 0,
            "category": slug,
            "deliveryType": "DeliveryHome",
            "includeChildCategories": "false",
            "inStock": "true",
        }
        
        print(f"--- Category: {slug} ---")
        print(f"Params: {params}")
        
        response = await client.fetch(url, params=params, headers=API_HEADERS)
        
        if response is None:
            print(f"  RESULT: No response (None)")
            continue
            
        print(f"  Status: {response.status_code}")
        print(f"  Content-Type: {response.headers.get('content-type', 'N/A')}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"  JSON keys: {list(data.keys())}")
                items = data.get("items") or data.get("products") or data.get("data") or []
                total = data.get("total") or data.get("totalItems") or data.get("count") or "N/A"
                print(f"  Items count: {len(items)}")
                print(f"  Total: {total}")
                
                if items:
                    first = items[0]
                    print(f"  First item keys: {list(first.keys())}")
                    print(f"  First item title: {first.get('title', 'N/A')}")
                    print(f"  First item price: {first.get('displayPrice') or first.get('price', 'N/A')}")
                else:
                    # Print raw response for debugging
                    text = response.text[:500]
                    print(f"  Raw response (first 500 chars): {text}")
            except Exception as e:
                print(f"  Parse error: {e}")
                print(f"  Raw text: {response.text[:300]}")
        else:
            print(f"  Error body: {response.text[:300]}")
        
        print()

if __name__ == "__main__":
    asyncio.run(test_api())
