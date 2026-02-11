import pytest
from apps.geo.services import find_cheapest_basket_in_radius, haversine_distance
from apps.core.models import Store, Product, StoreItem

@pytest.mark.django_db
def test_haversine_distance():
    # distance between Kyiv (50.4501, 30.5234) and Odesa (46.4825, 30.7233)
    # Approx 440-450 km
    kyiv_lat, kyiv_lon = 50.4501, 30.5234
    odesa_lat, odesa_lon = 46.4825, 30.7233
    
    dist = haversine_distance(kyiv_lat, kyiv_lon, odesa_lat, odesa_lon)
    assert 440 < dist < 450

@pytest.mark.django_db
class TestGeoService:
    def test_find_cheapest_basket_in_radius(self):
        # Setup: Create 2 stores. 
        # Store A: 2km away, Price 100
        # Store B: 8km away, Price 90
        # User is at (0,0) (Null Island simplification for easy calc, or use offsets)
        
        # 1 deg lat approx 111km. 0.01 deg approx 1km.
        
        user_lat, user_lon = 50.0, 30.0
        
        # Store A: Closest (approx 2km North)
        store_a = Store.objects.create(
            name="Store A",
            url_base="http://a.com",
            latitude=50.02, # ~2.2km
            longitude=30.0
        )
        
        # Store B: Farther (approx 9km North)
        store_b = Store.objects.create(
            name="Store B",
            url_base="http://b.com",
            latitude=50.08, # ~9km
            longitude=30.0
        )
        
        # Store C: Far away (20km)
        store_c = Store.objects.create(
            name="Store C",
            url_base="http://c.com",
            latitude=50.20,
            longitude=30.0
        )
        
        p = Product.objects.create(name="Bread")
        
        StoreItem.objects.create(store=store_a, product=p, price=100)
        StoreItem.objects.create(store=store_b, product=p, price=90)
        StoreItem.objects.create(store=store_c, product=p, price=50) # Cheapest but too far
        
        shopping_list = [{"product_id": p.id, "quantity": 1}]
        
        # Act
        results = find_cheapest_basket_in_radius(user_lat, user_lon, radius_km=10.0, shopping_list_items=shopping_list)
        
        # Assert
        assert len(results) == 2 # Store C excluded
        
        # First result should be best combo. 
        # Sort logic in service: missing_items, total_price, distance
        # Both share 0 missing. Store B is 90, Store A is 100.
        # Store B should be first.
        
        assert results[0]['store'].name == "Store B"
        assert results[0]['total_price'] == 90.0
        
        assert results[1]['store'].name == "Store A"
        assert results[1]['total_price'] == 100.0

