from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum

class VehicleType(Enum):
    SELF_OWNED = "Self-owned"
    RENTED = "Rented"

@dataclass
class Vehicle:
    """Vehicle data model"""
    id: str
    name: str
    vehicle_type: VehicleType
    capacity: int  # Number of seats
    cost_per_km: float  # Cost in PKR per kilometer
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'vehicle_type': self.vehicle_type.value,
            'capacity': self.capacity,
            'cost_per_km': self.cost_per_km
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Vehicle':
        return cls(
            id=data['id'],
            name=data['name'],
            vehicle_type=VehicleType(data['vehicle_type']),
            capacity=data['capacity'],
            cost_per_km=data['cost_per_km']
        )

@dataclass
class Depot:
    """Employee pickup depot"""
    id: str
    name: str
    latitude: float
    longitude: float
    worker_count: int
    max_pickup_per_vehicle: Optional[int] = None  # Max workers per vehicle visit
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'worker_count': self.worker_count,
            'max_pickup_per_vehicle': self.max_pickup_per_vehicle
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Depot':
        return cls(
            id=data['id'],
            name=data['name'],
            latitude=data['latitude'],
            longitude=data['longitude'],
            worker_count=data['worker_count'],
            max_pickup_per_vehicle=data.get('max_pickup_per_vehicle')
        )
    
    def can_be_split(self) -> bool:
        """Check if this depot can be visited by multiple vehicles"""
        return self.max_pickup_per_vehicle is not None and self.worker_count > self.max_pickup_per_vehicle

@dataclass
class Factory:
    """Factory location data model"""
    name: str
    latitude: float
    longitude: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Factory':
        return cls(
            name=data['name'],
            latitude=data['latitude'],
            longitude=data['longitude']
        )

@dataclass
class RouteStop:
    """Individual stop in a route"""
    depot_id: str
    depot_name: str
    latitude: float
    longitude: float
    worker_count: int  # Workers picked up at this stop
    arrival_order: int
    cumulative_load: int = 0  # Total workers in vehicle after this stop
    pickup_details: Optional[str] = None  # Additional pickup information
    
@dataclass
class RouteStep:
    """Turn-by-turn navigation step"""
    instruction: str
    distance_km: float
    duration_min: float
    type: str  # turn, depart, arrive, etc.
    modifier: str  # left, right, straight, etc.
    street_name: str = ""
    
@dataclass 
class RouteSegment:
    """Road segment between two points with turn-by-turn directions"""
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float
    distance_km: float
    duration_minutes: float
    waypoints: List[Tuple[float, float]] = field(default_factory=list)  # GPS coordinates along route
    steps: List[RouteStep] = field(default_factory=list)  # Turn-by-turn instructions

@dataclass
class OptimizedRoute:
    """Optimized route for a vehicle with real road navigation"""
    vehicle_id: str
    vehicle_name: str
    vehicle_type: VehicleType
    stops: List[RouteStop]
    total_distance_km: float
    total_cost: float
    utilization_percent: float
    route_segments: List[RouteSegment] = field(default_factory=list)  # Real road segments
    route_color: str = "#3388ff"  # Color for map visualization
    total_duration_minutes: float = 0.0
    max_passengers: int = 0  # Maximum passengers carried at any point
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'vehicle_id': self.vehicle_id,
            'vehicle_name': self.vehicle_name,
            'vehicle_type': self.vehicle_type.value,
            'stops': [
                {
                    'depot_id': stop.depot_id,
                    'depot_name': stop.depot_name,
                    'latitude': stop.latitude,
                    'longitude': stop.longitude,
                    'worker_count': stop.worker_count,
                    'arrival_order': stop.arrival_order,
                    'cumulative_load': stop.cumulative_load,
                    'pickup_details': stop.pickup_details
                }
                for stop in self.stops
            ],
            'total_distance_km': self.total_distance_km,
            'total_cost': self.total_cost,
            'utilization_percent': self.utilization_percent,
            'route_color': self.route_color,
            'total_duration_minutes': self.total_duration_minutes,
            'max_passengers': self.max_passengers,
            'route_segments': [
                {
                    'from_lat': seg.from_lat,
                    'from_lng': seg.from_lng,
                    'to_lat': seg.to_lat,
                    'to_lng': seg.to_lng,
                    'distance_km': seg.distance_km,
                    'duration_minutes': seg.duration_minutes,
                    'waypoints': seg.waypoints,
                    'steps': [
                        {
                            'instruction': step.instruction,
                            'distance_km': step.distance_km,
                            'duration_min': step.duration_min,
                            'type': step.type,
                            'modifier': step.modifier,
                            'street_name': step.street_name
                        }
                        for step in seg.steps
                    ] if seg.steps else []
                }
                for seg in self.route_segments
            ]
        }

@dataclass
class OptimizationResult:
    """Complete optimization result"""
    routes: List[OptimizedRoute]
    total_distance: float
    total_cost: float
    total_vehicles_used: int
    unassigned_depots: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'routes': [route.to_dict() for route in self.routes],
            'total_distance': self.total_distance,
            'total_cost': self.total_cost,
            'total_vehicles_used': self.total_vehicles_used,
            'unassigned_depots': self.unassigned_depots
        }

@dataclass
class AppConfiguration:
    """Complete application configuration"""
    factory: Optional[Factory] = None
    vehicles: List[Vehicle] = field(default_factory=list)
    depots: List[Depot] = field(default_factory=list)
    optimization_result: Optional[OptimizationResult] = None
    
    def is_complete(self) -> bool:
        """Check if configuration is complete for optimization"""
        return (
            self.factory is not None and
            len(self.vehicles) > 0 and
            len(self.depots) > 0
        )
    
    def get_progress_step(self) -> int:
        """Get current configuration progress (1-4)"""
        if self.factory is None:
            return 1
        elif len(self.vehicles) == 0:
            return 2
        elif len(self.depots) == 0:
            return 3
        else:
            return 4
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'factory': self.factory.to_dict() if self.factory else None,
            'vehicles': [vehicle.to_dict() for vehicle in self.vehicles],
            'depots': [depot.to_dict() for depot in self.depots],
            'optimization_result': self.optimization_result.to_dict() if self.optimization_result else None
        }