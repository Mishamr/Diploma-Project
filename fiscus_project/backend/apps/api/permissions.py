from rest_framework import permissions

class IsPremiumUser(permissions.BasePermission):
    """
    Allocates access only to users with an active premium subscription.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.is_premium
        )


class IsManager(permissions.BasePermission):
    """
    Allocates access only to Managers (Staff or 'Managers' group).
    
    RBAC Rule: Managers have Read+Write+Execute access.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Check if user is staff (Admin)
        if request.user.is_staff:
            return True
            
        # Check if user is in 'Managers' group
        return request.user.groups.filter(name='Managers').exists()
