from decimal import Decimal
import pytest
from apps.scraper.utils import calculate_unit_price

class TestFiscusLogic:
    """
    Goal: Verify the internal logic WITHOUT hitting the internet or real database.
    File: tests/test_logic.py
    """

    @pytest.mark.parametrize("price, weight_str, expected", [
        (100.0, "100g", "100.00"),    # 100 UAH / 100g -> 100
        (50.0, "200 g", "25.00"),     # 50 UAH / 200g -> 25 per 100g
        (200.0, "1 kg", "20.00"),     # 200 UAH / 1000g -> 20 per 100g
        (15.0, "50g", "30.00"),       # 15 UAH / 50g -> 30 per 100g
        (120.0, "0.5 л", "24.00"),    # 120 UAH / 500ml -> 24 per 100ml
    ])
    def test_calculate_unit_price_valid(self, price, weight_str, expected):
        """
        Test Fiscus Algorithm: Test calculate_unit_price with valid inputs.
        """
        result = calculate_unit_price(price, weight_str)
        assert result == Decimal(expected)

    @pytest.mark.parametrize("weight_str", [
        "Pack of chips", "Unknown", "", None
    ])
    def test_calculate_unit_price_invalid_weight(self, weight_str):
        """
        Data Parsing: Test handling of invalid weight strings.
        """
        result = calculate_unit_price(100.0, weight_str)
        assert result is None

    def test_fiscus_index_calculation_mock(self):
        """
        Test Fiscus Index logic mock.
        Formula: Quality / Price_Per_100g
        """
        # Scenario: Quality 8, PricePer100g = 20.00
        quality_score = 8
        price_per_100g = 20.0
        
        expected_index = quality_score / price_per_100g
        assert expected_index == 0.4
