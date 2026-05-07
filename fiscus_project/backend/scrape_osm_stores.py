import os
import sys
import django
import requests

# Set up Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Store, Chain

def scrape_osm_stores():
    print("Fetching stores from OpenStreetMap via Overpass API...")
    overpass_url = "http://overpass-api.de/api/interpreter"
    
    # Query for Lviv area and specifically the 3 chains.
    # We match name variants to ensure we get them all.
    overpass_query = """
    [out:json];
    area["name"="Львів"]->.searchArea;
    (
      node["name"~"АТБ|Сільпо|Ашан|ATB|Silpo|Auchan",i](area.searchArea);
      way["name"~"АТБ|Сільпо|Ашан|ATB|Silpo|Auchan",i](area.searchArea);
      relation["name"~"АТБ|Сільпо|Ашан|ATB|Silpo|Auchan",i](area.searchArea);
    );
    out center;
    """
    
    headers = {'User-Agent': 'FiscusApp/1.0'}
    response = requests.post(overpass_url, data=overpass_query.encode('utf-8'), headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to fetch from Overpass API: {response.status_code}")
        print(response.text)
        return
        
    data = response.json()
    elements = data.get('elements', [])
    
    print(f"Found {len(elements)} store elements in OSM.")
    
    chain_map = {
        'atb': Chain.objects.get(slug='atb'),
        'silpo': Chain.objects.get(slug='silpo'),
        'auchan': Chain.objects.get(slug='auchan'),
    }
    
    added = 0
    for element in elements:
        tags = element.get('tags', {})
        name = tags.get('name', '')
        
        # Determine chain
        slug = None
        if 'атб' in name.lower() or 'atb' in name.lower():
            slug = 'atb'
            store_name = 'АТБ'
        elif 'сільпо' in name.lower() or 'silpo' in name.lower():
            slug = 'silpo'
            store_name = 'Сільпо'
        elif 'ашан' in name.lower() or 'auchan' in name.lower():
            slug = 'auchan'
            store_name = 'Ашан'
            
        if not slug:
            continue
            
        # Get coordinates
        if element['type'] == 'node':
            lat, lon = element['lat'], element['lon']
        else:
            lat, lon = element['center']['lat'], element['center']['lon']
            
        # Get address if available
        address = tags.get('addr:street', '')
        housenumber = tags.get('addr:housenumber', '')
        full_address = f"вул. {address}, {housenumber}" if address else "Львів"
        if not address and 'addr:full' in tags:
            full_address = tags['addr:full']
            
        # Add to DB
        chain = chain_map[slug]
        
        # Check if already exists near this coordinate
        # (avoid exact duplicates but add if missing)
        exists = Store.objects.filter(
            chain=chain, 
            latitude__range=(lat-0.001, lat+0.001), 
            longitude__range=(lon-0.001, lon+0.001)
        ).exists()
        
        if not exists:
            Store.objects.create(
                name=f"{store_name} ({address} {housenumber})".strip(' ()'),
                chain=chain,
                latitude=lat,
                longitude=lon,
                address=full_address,
                city="Львів",
                is_active=True
            )
            added += 1
            
    print(f"Successfully added {added} new stores to the database!")

if __name__ == "__main__":
    scrape_osm_stores()
