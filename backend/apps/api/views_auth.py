"""
Auth views — registration, login, logout, profile, Google OAuth.
"""

import logging
import requests as http_requests
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .serializers import RegisterSerializer, LoginSerializer, UserProfileSerializer
from apps.core.models import UserProfile

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """POST /api/v1/auth/register/"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """POST /api/v1/auth/login/"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
        )
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                }
            })
        return Response(
            {'error': 'Невірний логін або пароль'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login_view(request):
    """POST /api/v1/auth/google/ — Google OAuth sign-in.

    Receives a Google access_token, verifies it against Google's
    userinfo endpoint, auto-creates a Django user if needed,
    and returns an app auth token.
    """
    access_token = request.data.get('access_token')
    if not access_token:
        return Response(
            {'error': 'access_token is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verify token with Google
    try:
        logger.info(f"Verifying Google token: {access_token[:10]}...")
        google_resp = http_requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        if google_resp.status_code != 200:
            logger.error(f"Google Auth failed: {google_resp.status_code} - {google_resp.text}")
            return Response(
                {'error': f'Invalid Google token: {google_resp.text}'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        google_user = google_resp.json()
        logger.info(f"Google user data: {google_user}")
    except Exception as e:
        logger.error(f"Google Auth Exception: {e}")
        return Response(
            {'error': f'Failed to verify Google token: {str(e)}'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    email = google_user.get('email')
    if not email:
        return Response(
            {'error': 'Google account has no email'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Find or create user
    user = User.objects.filter(email=email).first()
    if not user:
        # Auto-register from Google profile
        username = email.split('@')[0]
        # Ensure unique username
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{counter}'
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=google_user.get('given_name', ''),
            last_name=google_user.get('family_name', ''),
        )
        # Set unusable password — user logs in via Google only
        user.set_unusable_password()
        user.save()
        UserProfile.objects.get_or_create(user=user)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'picture': google_user.get('picture', ''),
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """POST /api/v1/auth/logout/"""
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'message': 'Logged out'}, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """GET/PUT /api/v1/auth/profile/"""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
