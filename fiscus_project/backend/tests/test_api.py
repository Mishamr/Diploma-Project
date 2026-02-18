import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.core.models import Product, Store, StoreItem, ShoppingList

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_user():
    return User.objects.create_user(username='testuser', password='password123')

@pytest.fixture
def authenticated_client(api_client, test_user):
    api_client.force_authenticate(user=test_user)
    return api_client

@pytest.fixture
def sample_data():
    store = Store.objects.create(name="ATB", url_base="https://atb.ua", latitude=50.0, longitude=30.0)
    product = Product.objects.create(name="Milk", category="Dairy")
    item = StoreItem.objects.create(store=store, product=product, price=30.00, price_per_100g=3.00)
    return store, product, item

@pytest.mark.django_db
class TestProductAPI:
    def test_list_products(self, api_client, sample_data):
        response = api_client.get('/api/v1/products/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Milk'

    def test_product_detail(self, api_client, sample_data):
        _, product, _ = sample_data
        response = api_client.get(f'/api/v1/products/{product.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'cheapest_option' in response.data
        assert response.data['cheapest_option']['price'] == '30.00'

@pytest.mark.django_db
class TestStoreAPI:
    def test_list_stores(self, api_client, sample_data):
        response = api_client.get('/api/v1/stores/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_nearby_stores_valid(self, api_client, sample_data):
        # Coordinates near the store (50.0, 30.0)
        response = api_client.get('/api/v1/stores/nearby/?lat=50.01&lon=30.01&radius=10')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_nearby_stores_invalid_params(self, api_client):
        response = api_client.get('/api/v1/stores/nearby/?lat=invalid')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
class TestShoppingListAPI:
    def test_create_list_authenticated(self, authenticated_client):
        data = {'name': 'Weekly Groceries'}
        response = authenticated_client.post('/api/v1/shopping-lists/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert ShoppingList.objects.count() == 1
        assert ShoppingList.objects.first().user.username == 'testuser'

    def test_create_list_unauthenticated(self, api_client):
        data = {'name': 'Weekly Groceries'}
        response = api_client.post('/api/v1/shopping-lists/', data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_add_item_to_list(self, authenticated_client, sample_data):
        store, product, item = sample_data
        # Create list first
        list_response = authenticated_client.post('/api/v1/shopping-lists/', {'name': 'My List'})
        list_id = list_response.data['id']

        # Add item
        item_data = {'product_id': product.id, 'quantity': 2}
        response = authenticated_client.post(f'/api/v1/shopping-lists/{list_id}/add_item/', item_data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_items'] == 1
        # Check database
        shopping_list = ShoppingList.objects.get(id=list_id)
        assert shopping_list.items.count() == 1
        assert shopping_list.shoppinglistitem_set.first().quantity == 2

    def test_get_own_lists_only(self, authenticated_client, api_client):
        # Create list for user 1
        authenticated_client.post('/api/v1/shopping-lists/', {'name': 'User 1 List'})
        
        # Create user 2 and their list
        user2 = User.objects.create_user(username='user2', password='password')
        client2 = APIClient()
        client2.force_authenticate(user=user2)
        client2.post('/api/v1/shopping-lists/', {'name': 'User 2 List'})

        # User 1 should only see their list
        response = authenticated_client.get('/api/v1/shopping-lists/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'User 1 List'

@pytest.mark.django_db
class TestComparisonAPI:
    def test_comparison_db_source(self, api_client, sample_data):
        store, product, item = sample_data
        # Search for "Milk"
        response = api_client.get('/api/v1/comparison/?q=Milk')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) > 0
        # Check that we got the real item from DB
        first_result = response.data[0]
        assert first_result['store_name'] == 'ATB'
        assert first_result['price'] == 30.0
        assert first_result.get('is_real') is True
