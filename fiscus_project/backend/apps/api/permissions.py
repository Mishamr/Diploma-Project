"""
Custom permissions for Fiscus API.

This module defines custom DRF permission classes
for controlling access to premium features.
"""
import logging
from rest_framework import permissions

logger = logging.getLogger(__name__)


class IsPremiumUser(permissions.BasePermission):
    """
    Permission class that allows access only to premium users.
    
    Checks if the authenticated user has an associated profile
    with is_premium flag set to True.
    
    Usage:
        permission_classes = [permissions.IsAuthenticated, IsPremiumUser]
    """
    message = "This feature is available only for Premium users."

    def has_permission(self, request, view) -> bool:
        """
        Check if user has premium access.
        
        Args:
            request: DRF Request object.
            view: The view being accessed.
        
        Returns:
            bool: True if user is authenticated and has premium status.
        """
        # Check authentication
        if not request.user or not request.user.is_authenticated:
            return False

        # Check premium status
        try:
            is_premium = bool(request.user.profile.is_premium)
            if not is_premium:
                logger.debug(
                    f"User {request.user.username} attempted to access "
                    f"premium feature without subscription"
                )
            return is_premium
        except AttributeError:
            # User doesn't have a profile
            logger.warning(
                f"User {request.user.username} has no profile attached"
            )
            return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission that allows owners to edit.
    
    Allows read-only access for any request, but requires
    the user to be the owner for write operations.
    
    Note:
        Object must have a 'user' or 'owner' attribute.
    """
    message = "You don't have permission to modify this object."

    def has_object_permission(self, request, view, obj) -> bool:
        """
        Check if user can access/modify the object.
        
        Args:
            request: DRF Request object.
            view: The view being accessed.
            obj: The object being accessed.
        
        Returns:
            bool: True if read-only or user is owner.
        """
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for owner
        owner = getattr(obj, 'user', None) or getattr(obj, 'owner', None)
        return owner == request.user
