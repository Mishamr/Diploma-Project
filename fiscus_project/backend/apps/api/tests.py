from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from apps.core.models import Product, Store, StoreItem, ShoppingList

class ProductApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        
        self.p1 = Product.objects.create(name='Milk', category='Dairy')
        self.s1 = Store.objects.create(name='TestStore', url_base='http://test.com')
        StoreItem.objects.create(store=self.s1, product=self.p1, price=25.00)
        
    def test_get_products(self):
        url = '/api/v1/products/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Status: {response.status_code}, Data: {response.data}")
        
        data = response.data
        if 'results' in data:
            data = data['results']
            
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'Milk')

    def test_search_products(self):
        url = '/api/v1/products/?search=Milk'
        response = self.client.get(url)
        
        data = response.data
        if 'results' in data:
            data = data['results']
            
        self.assertEqual(len(data), 1)
        
        url = '/api/v1/products/?search=Bread'
        response = self.client.get(url)
        
        data = response.data
        if 'results' in data:
            data = data['results']
            
        self.assertEqual(len(data), 0)

class PremiumApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='basic', password='password')
        self.premium_user = User.objects.create_user(username='premium', password='password')
        self.premium_user.profile.is_premium = True
        self.premium_user.profile.save()
        
    def test_survival_mode_access(self):
        url = '/api/v1/premium/survival/'
        data = {'budget': 500, 'days': 7}
        
        # 1. Unauthenticated
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # 2. Basic User (Forbidden)
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 3. Premium User (Allowed)
        self.client.force_authenticate(user=self.premium_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return menu structure
        self.assertIn('items', response.data)
