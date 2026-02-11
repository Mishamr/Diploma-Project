import pytest
from decimal import Decimal
from apps.core.services.survival import generate_survival_menu
from apps.core.models import Store, Product, StoreItem

@pytest.mark.django_db
def test_generate_survival_menu_basics():
    # Setup some basic cheap items
    store = Store.objects.create(name="CheapStore", url_base="http://cheap.com")
    
    # Create staples
    p1 = Product.objects.create(name="Buckwheat")
    StoreItem.objects.create(store=store, product=p1, price=Decimal("30.00"))
    
    p2 = Product.objects.create(name="Eggs")
    StoreItem.objects.create(store=store, product=p2, price=Decimal("40.00"))
    
    p3 = Product.objects.create(name="Potatoes")
    StoreItem.objects.create(store=store, product=p3, price=Decimal("15.00"))
    
    # Act
    # Budget 500 for 7 days
    result = generate_survival_menu(budget=500, days=7)
    
    # Assert
    assert result['budget'] == 500.0
    assert result['days'] == 7
    assert result['total_cost'] <= 500
    assert result['is_sufficient'] is True
    assert len(result['items']) > 0
    
    # Check if we have carbs (Buckwheat)
    names = [item['product_name'] for item in result['items']]
    assert "Buckwheat" in names

@pytest.mark.django_db
def test_generate_survival_menu_low_budget():
    # Setup expensive items only
    store = Store.objects.create(name="ExpensiveStore", url_base="http://ex.com")
    p1 = Product.objects.create(name="Buckwheat")
    StoreItem.objects.create(store=store, product=p1, price=Decimal("300.00"))
    
    # Budget 100 for 7 days - cannot afford Buckwheat
    result = generate_survival_menu(budget=100, days=7)
    
    # Should handle gracefully (empty items or partial)
    assert result['total_cost'] <= 100
    # Logic in service: checks (total_cost + cost <= budget). 
    # If first item is 300 * 2 = 600 > 100, it won't be added.
    
    assert len(result['items']) == 0
