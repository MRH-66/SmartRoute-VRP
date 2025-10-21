import math
import requests
from typing import List, Tuple, Dict, Optional
from geopy.distance import geodesic

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth using Haversine formula
    Returns distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r

def calculate_geodesic_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate geodesic distance using geopy (more accurate than Haversine)
    Returns distance in kilometers
    """
    point1 = (lat1, lon1)
    point2 = (lat2, lon2)
    return geodesic(point1, point2).kilometers

def get_osrm_distance_matrix(coordinates: List[Tuple[float, float]], 
                            use_fallback: bool = True) -> Optional[List[List[float]]]:
    """
    Get distance matrix using OSRM (Open Source Routing Machine) API
    Returns matrix with distances in kilometers
    
    Args:
        coordinates: List of (lat, lon) tuples
        use_fallback: If True, use geodesic calculation as fallback
    
    Returns:
        2D list representing distance matrix, or None if API fails
    """
    try:
        # Format coordinates for OSRM API (lon,lat format)
        coord_string = ";".join([f"{lon},{lat}" for lat, lon in coordinates])
        
        # OSRM demo server - for production, use your own OSRM instance
        url = f"http://router.project-osrm.org/table/v1/driving/{coord_string}"
        
        params = {
            'sources': ';'.join([str(i) for i in range(len(coordinates))]),
            'destinations': ';'.join([str(i) for i in range(len(coordinates))])
        }
        
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if 'durations' in data:
                # Convert from seconds to hours, then estimate distance using average speed
                durations = data['durations']
                
                # Estimate distance: assuming average speed of 30 km/h in city traffic
                avg_speed_kmh = 30
                distance_matrix = []
                
                for row in durations:
                    distance_row = []
                    for duration_seconds in row:
                        if duration_seconds is None:
                            distance_km = float('inf')
                        else:
                            duration_hours = duration_seconds / 3600
                            distance_km = duration_hours * avg_speed_kmh
                        distance_row.append(distance_km)
                    distance_matrix.append(distance_row)
                
                return distance_matrix
    
    except Exception as e:
        print(f"OSRM API error: {e}")
    
    # Fallback to geodesic calculation
    if use_fallback:
        print("Using geodesic distance calculation as fallback")
        return calculate_geodesic_distance_matrix(coordinates)
    
    return None

def calculate_geodesic_distance_matrix(coordinates: List[Tuple[float, float]]) -> List[List[float]]:
    """
    Calculate distance matrix using geodesic distances
    Returns matrix with distances in kilometers
    """
    n = len(coordinates)
    matrix = [[0.0 for _ in range(n)] for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i != j:
                lat1, lon1 = coordinates[i]
                lat2, lon2 = coordinates[j]
                distance = calculate_geodesic_distance(lat1, lon1, lat2, lon2)
                matrix[i][j] = distance
            else:
                matrix[i][j] = 0.0
    
    return matrix

def create_distance_matrix(factory_coords: Tuple[float, float], 
                          spot_coords: List[Tuple[float, float]],
                          use_osrm: bool = True) -> Dict[str, any]:
    """
    Create distance matrix for VRP solving
    
    Args:
        factory_coords: (lat, lon) of factory
        spot_coords: List of (lat, lon) for each pickup_spot
        use_osrm: Whether to try OSRM API first
    
    Returns:
        Dictionary containing distance matrix and metadata
    """
    # Combine all coordinates (factory first, then pickup_spots)
    all_coordinates = [factory_coords] + spot_coords
    
    # Try OSRM first, then fallback to geodesic
    if use_osrm:
        distance_matrix = get_osrm_distance_matrix(all_coordinates)
    else:
        distance_matrix = None
    
    # Fallback to geodesic if OSRM failed
    if distance_matrix is None:
        distance_matrix = calculate_geodesic_distance_matrix(all_coordinates)
        method_used = "geodesic"
    else:
        method_used = "osrm"
    
    return {
        'matrix': distance_matrix,
        'method': method_used,
        'factory_index': 0,
        'spot_indices': list(range(1, len(all_coordinates))),
        'coordinates': all_coordinates
    }

def validate_distance_matrix(matrix: List[List[float]]) -> bool:
    """
    Validate that the distance matrix is properly formatted
    """
    if not matrix:
        return False
    
    n = len(matrix)
    
    # Check if matrix is square
    for row in matrix:
        if len(row) != n:
            return False
    
    # Check diagonal is zero
    for i in range(n):
        if matrix[i][i] != 0:
            return False
    
    # Check for negative distances
    for i in range(n):
        for j in range(n):
            if matrix[i][j] < 0:
                return False
    
    return True

def optimize_distance_matrix(matrix: List[List[float]], 
                           max_distance_km: float = 500) -> List[List[float]]:
    """
    Optimize distance matrix by capping unreasonable distances
    """
    optimized = []
    
    for row in matrix:
        optimized_row = []
        for distance in row:
            if distance == float('inf') or distance > max_distance_km:
                optimized_row.append(max_distance_km)
            else:
                optimized_row.append(distance)
        optimized.append(optimized_row)
    
    return optimized