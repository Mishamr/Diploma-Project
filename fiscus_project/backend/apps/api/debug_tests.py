from django.test import TestCase
from django.contrib.auth.models import User
from apps.core.models import UserProfile

class SignalTest(TestCase):
    def test_profile_created(self):
        u = User.objects.create_user('signaltest', 'p')
        self.assertTrue(hasattr(u, 'profile'))
        self.assertIsInstance(u.profile, UserProfile)
