import math

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate Haversine distance between two points in km.
    """
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def calculate_logistics(store_lat, store_lon, user_lat, user_lon, cart_total=0):
    """
    Calculate delivery cost based on Lviv logistics rules.
    """
    if not store_lat or not store_lon or not user_lat or not user_lon:
        return {
            'distance_km': 0,
            'delivery_cost': 0,
            'is_free': False,
            'error': 'Coordinates missing'
        }

    distance = calculate_distance(store_lat, store_lon, user_lat, user_lon)
    distance = round(distance, 1)

    delivery_cost = 0
    base_rate = 69.00
    km_rate = 15.00
    free_threshold = 1000.00 # Higher threshold for demo realism

    if distance <= 5.0:
        if cart_total >= free_threshold:
            delivery_cost = 0
        else:
            delivery_cost = base_rate
    else:
        # 5km base + extra
        extra_km = math.ceil(distance - 5.0)
        delivery_cost = base_rate + (extra_km * km_rate)

    return {
        'distance_km': distance,
        'delivery_cost': round(delivery_cost, 2),
        'is_free': delivery_cost == 0
    }
