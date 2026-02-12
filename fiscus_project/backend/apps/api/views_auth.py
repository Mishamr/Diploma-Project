from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework.serializers import ModelSerializer
from rest_framework.views import APIView

class RegisterSerializer(ModelSerializer):
    """
    Serializer for User Registration.
    """
    class Meta:
        model = User
        fields = ('username', 'password', 'email')
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', '')
        )
        return user

class RegisterView(generics.CreateAPIView):
    """
    API view for User Registration.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileSerializer(ModelSerializer):
    """
    Serializer for User Profile.
    """
    is_premium = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'date_joined', 'is_premium')
        read_only_fields = ('id', 'date_joined', 'is_premium')

    def get_is_premium(self, obj):
        # Check if user has related profile and return premium status
        if hasattr(obj, 'profile'):
            return obj.profile.is_premium
        return False

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    API view for getting and updating User Profile.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserProfileSerializer

    def get_object(self):
        # Return the currently authenticated user
        return self.request.user
