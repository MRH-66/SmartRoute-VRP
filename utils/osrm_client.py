"""
OSRM Client for Real Road Routing
Provides distance and route geometry using OpenStreetMap road network
"""

import requests
from typing import List, Dict, Tuple, Optional
from geopy.distance import geodesic
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OSRM Demo Server (free, no API key required)
# Try HTTPS first, fallback to HTTP if needed
OSRM_BASE_URL = "https://router.project-osrm.org"

class OSRMClient:
    """Client for interacting with OSRM routing service"""
    
    def __init__(self, base_url: str = OSRM_BASE_URL):
        self.base_url = base_url
        self.timeout = 10  # seconds
        
    def get_distance(
        self, 
        start_lat: float, 
        start_lon: float, 
        end_lat: float, 
        end_lon: float
    ) -> Optional[float]:
        """
        Get road distance between two points in kilometers
        
        Args:
            start_lat, start_lon: Starting coordinates
            end_lat, end_lon: Ending coordinates
            
        Returns:
            Distance in km, or None if request fails
        """
        try:
            # OSRM route endpoint format: /route/v1/driving/{lon},{lat};{lon},{lat}
            url = f"{self.base_url}/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}"
            params = {
                "overview": "false",  # We just need distance, not geometry
                "geometries": "geojson"
            }
            
            logger.debug(f"OSRM request URL: {url}")
            response = requests.get(url, params=params, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    # Distance is in meters, convert to km
                    distance_km = data["routes"][0]["distance"] / 1000.0
                    return distance_km
                else:
                    logger.warning(f"OSRM returned non-OK code: {data.get('code')} - Message: {data.get('message')}")
                    return None
            else:
                logger.warning(f"OSRM request failed with status {response.status_code}: {response.text}")
                return None
                
        except requests.Timeout:
            logger.warning("OSRM request timed out")
            return None
        except requests.RequestException as e:
            logger.warning(f"OSRM request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in OSRM distance calculation: {e}")
            return None
    
    def get_route_geometry(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float
    ) -> Optional[List[List[float]]]:
        """
        Get route geometry (list of coordinates) between two points
        
        Args:
            start_lat, start_lon: Starting coordinates
            end_lat, end_lon: Ending coordinates
            
        Returns:
            List of [lon, lat] coordinates representing the route, or None if fails
        """
        try:
            url = f"{self.base_url}/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}"
            params = {
                "overview": "full",  # Get full route geometry
                "geometries": "geojson"
            }
            
            response = requests.get(url, params=params, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    # Extract coordinates from GeoJSON geometry
                    geometry = data["routes"][0]["geometry"]["coordinates"]
                    return geometry  # List of [lon, lat] pairs
                else:
                    logger.warning(f"OSRM returned non-OK code: {data.get('code')}")
                    return None
            else:
                logger.warning(f"OSRM request failed with status {response.status_code}")
                return None
                
        except requests.Timeout:
            logger.warning("OSRM request timed out")
            return None
        except requests.RequestException as e:
            logger.warning(f"OSRM request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in OSRM geometry calculation: {e}")
            return None
    
    def get_multi_route(
        self,
        coordinates: List[Tuple[float, float]],
        steps: bool = True
    ) -> Optional[Dict]:
        """
        Get route through multiple waypoints with optional turn-by-turn steps
        
        Args:
            coordinates: List of (lat, lon) tuples
            steps: Whether to include turn-by-turn directions
            
        Returns:
            Dict with distance, duration, geometry, and steps, or None if fails
        """
        if len(coordinates) < 2:
            logger.error("Need at least 2 coordinates for route")
            return None
            
        try:
            # Format coordinates for OSRM: lon,lat;lon,lat;...
            coord_string = ";".join([f"{lon},{lat}" for lat, lon in coordinates])
            url = f"{self.base_url}/route/v1/driving/{coord_string}"
            params = {
                "overview": "full",
                "geometries": "geojson",
                "steps": "true" if steps else "false"
            }
            
            logger.debug(f"OSRM multi-route request URL: {url}")
            response = requests.get(url, params=params, timeout=self.timeout)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    result = {
                        "distance_km": route["distance"] / 1000.0,
                        "duration_min": route["duration"] / 60.0,
                        "geometry": route["geometry"]["coordinates"],  # List of [lon, lat]
                        "legs": []
                    }
                    
                    # Extract turn-by-turn steps if requested
                    if steps and "legs" in route:
                        for leg in route["legs"]:
                            leg_steps = []
                            if "steps" in leg:
                                for step in leg["steps"]:
                                    leg_steps.append({
                                        "distance_km": step["distance"] / 1000.0,
                                        "duration_min": step["duration"] / 60.0,
                                        "instruction": step.get("maneuver", {}).get("instruction", "Continue"),
                                        "type": step.get("maneuver", {}).get("type", "turn"),
                                        "modifier": step.get("maneuver", {}).get("modifier", ""),
                                        "name": step.get("name", ""),
                                        "ref": step.get("ref", "")
                                    })
                            result["legs"].append({
                                "steps": leg_steps,
                                "distance_km": leg["distance"] / 1000.0,
                                "duration_min": leg["duration"] / 60.0
                            })
                    
                    return result
                else:
                    logger.warning(f"OSRM returned non-OK code: {data.get('code')} - Message: {data.get('message')}")
                    return None
            else:
                logger.warning(f"OSRM request failed with status {response.status_code}: {response.text}")
                return None
                
        except requests.Timeout:
            logger.warning("OSRM request timed out")
            return None
        except requests.RequestException as e:
            logger.warning(f"OSRM request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in OSRM multi-route calculation: {e}")
            return None


def calculate_distance_with_osrm(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    use_osrm: bool = True
) -> float:
    """
    Calculate distance between two points, using OSRM if available, 
    falling back to Haversine
    
    Args:
        start_lat, start_lon: Starting coordinates
        end_lat, end_lon: Ending coordinates
        use_osrm: Whether to attempt OSRM (True) or use Haversine directly (False)
        
    Returns:
        Distance in kilometers
    """
    if use_osrm:
        client = OSRMClient()
        distance = client.get_distance(start_lat, start_lon, end_lat, end_lon)
        
        if distance is not None:
            logger.info(f"OSRM distance: {distance:.2f} km")
            return distance
        else:
            logger.info("OSRM failed, falling back to Haversine")
    
    # Fallback to Haversine (straight-line distance)
    distance = geodesic((start_lat, start_lon), (end_lat, end_lon)).kilometers
    logger.info(f"Haversine distance: {distance:.2f} km")
    return distance


def get_route_with_geometry(
    coordinates: List[Tuple[float, float]],
    use_osrm: bool = True,
    include_steps: bool = True
) -> Dict:
    """
    Get route information including geometry and turn-by-turn directions
    
    Args:
        coordinates: List of (lat, lon) tuples for the route
        use_osrm: Whether to use OSRM or calculate straight-line
        include_steps: Whether to include turn-by-turn directions
        
    Returns:
        Dict with distance_km, duration_min, geometry, and legs with steps
    """
    if len(coordinates) < 2:
        return {
            "distance_km": 0.0,
            "duration_min": 0.0,
            "geometry": [],
            "legs": []
        }
    
    if use_osrm:
        client = OSRMClient()
        route_data = client.get_multi_route(coordinates, steps=include_steps)
        
        if route_data is not None:
            return route_data
        else:
            logger.info("OSRM failed, creating straight-line geometry")
    
    # Fallback: Calculate straight-line distance and create simple geometry
    total_distance = 0.0
    geometry = []
    
    for i in range(len(coordinates)):
        lat, lon = coordinates[i]
        geometry.append([lon, lat])  # GeoJSON format: [lon, lat]
        
        if i > 0:
            prev_lat, prev_lon = coordinates[i-1]
            segment_distance = geodesic((prev_lat, prev_lon), (lat, lon)).kilometers
            total_distance += segment_distance
    
    # Estimate duration assuming 40 km/h average speed
    duration_min = (total_distance / 40.0) * 60.0
    
    return {
        "distance_km": total_distance,
        "duration_min": duration_min,
        "geometry": geometry,
        "legs": []  # No turn-by-turn for fallback
    }
