"""
Premium API Views for Fiscus application.

This module provides Premium-only endpoints for advanced features
like Survival Mode and Price History tracking.
"""
import logging
import random
from datetime import datetime, timedelta
from decimal import Decimal

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from apps.core.models import Product, Price
from apps.core.services.survival import generate_survival_menu
from apps.api.permissions import IsPremiumUser

logger = logging.getLogger(__name__)


class SurvivalView(APIView):
    """
    API view for Survival Mode feature.
    
    Generates a budget-optimized meal plan for a specified
    number of days based on available products and prices.
    
    Endpoint:
        POST /api/v1/premium/survival/
    
    Body:
        {
            "budget": 500,  // Total budget in UAH (required)
            "days": 7       // Number of days (default: 7)
        }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Generate a survival menu within budget constraints.
        
        Args:
            request: DRF Request with budget and days in body.
        
        Returns:
            Dict with menu items, total cost, and sufficiency status.
        """
        # Check premium status
        is_premium = self._check_premium_status(request.user)
        
        if not is_premium:
            return Response(
                {"error": "Upgrade to Premium to access Survival Mode"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate input
        budget = request.data.get('budget')
        days = request.data.get('days', 7)

        if not budget:
            return Response(
                {"error": "Budget is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            budget = float(budget)
            days = int(days)
            
            if budget <= 0:
                raise ValueError("Budget must be positive")
            if days <= 0 or days > 30:
                raise ValueError("Days must be between 1 and 30")
                
        except (ValueError, TypeError) as e:
            return Response(
                {"error": f"Invalid input: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate menu
        try:
            menu = generate_survival_menu(budget, days)
            logger.info(f"Generated survival menu for {days} days, budget {budget}₴")
            return Response(menu)
        except Exception as e:
            logger.exception("Failed to generate survival menu")
            return Response(
                {"error": "Failed to generate menu. Please try increasing budget."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _check_premium_status(self, user) -> bool:
        """
        Check if user has premium subscription.
        
        Args:
            user: Django User instance.
        
        Returns:
            bool: True if user has premium access.
        """
        try:
            return bool(user.profile.is_premium)
        except AttributeError:
            return False


class PriceHistoryView(APIView):
    """
    API view for price history data.
    
    Returns historical price data for a specific product,
    used for rendering price trend charts.
    
    Endpoint:
        GET /api/v1/premium/history/<product_id>/
    """
    permission_classes = [permissions.IsAuthenticated, IsPremiumUser]

    def get(self, request, product_id: int):
        """
        Get price history for a product.
        
        Args:
            request: DRF Request object.
            product_id: ID of the product to get history for.
        
        Returns:
            List of price records with date and store info.
        """
        try:
            # Validate product exists
            if not Product.objects.filter(id=product_id).exists():
                return Response(
                    {"error": f"Product with ID {product_id} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Fetch price history (last 30 records)
            history = Price.objects.filter(
                product_id=product_id
            ).order_by('-scraped_at')[:30]

            data = [
                {
                    "price": float(p.price_value),
                    "date": p.scraped_at.strftime("%Y-%m-%d"),
                    "store": p.store_name
                }
                for p in history
            ]

            # If no history exists, generate mock data for demo
            if not data:
                data = self._generate_mock_history()
                logger.info(f"Generated mock history for product {product_id}")

            # Extract just prices array for chart compatibility
            prices = [item["price"] for item in data]
            
            return Response({
                "product_id": product_id,
                "history": data,
                "prices": prices,  # Array format expected by frontend
            })

        except Exception as e:
            logger.exception(f"Failed to get price history for product {product_id}")
            return Response(
                {"error": "Failed to retrieve price history"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_mock_history(self) -> list:
        """
        Generate mock price history for demonstration.
        
        Returns:
            List of mock price records.
        """
        base_price = 100.0
        mock_data = []
        
        for i in range(10):
            date = (datetime.now() - timedelta(days=10 - i)).strftime("%Y-%m-%d")
            price = base_price + random.uniform(-10, 10)
            mock_data.append({
                "price": round(price, 2),
                "date": date,
                "store": "MockStore"
            })
        
        return mock_data
