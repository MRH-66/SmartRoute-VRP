"""
Advanced VRP Solver with Proper Optimization
- Minimizes total cost
- Prevents unnecessary pickup spot splitting
- Optimizes vehicle selection
- Uses ALNS (Adaptive Large Neighborhood Search) with Greedy Algorithm
- Supports OSRM for real road routing
"""

import random
import numpy as np
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass, field
import copy
from geopy.distance import geodesic

from models.data_models import (
    Vehicle, PickupSpot, Factory, OptimizedRoute, RouteStop, RouteSegment, RouteStep,
    OptimizationResult, VehicleType
)
from utils.osrm_client import calculate_distance_with_osrm, get_route_with_geometry

@dataclass
class Assignment:
    """Assignment of workers from a pickup spot to a vehicle"""
    pickupspot_id: str
    vehicle_id: str
    workers: int
    
@dataclass
class Solution:
    """Complete VRP solution"""
    assignments: List[Assignment] = field(default_factory=list)
    fitness: float = 0.0
    total_cost: float = 0.0
    total_distance: float = 0.0
    vehicles_used: int = 0
    
    def copy(self):
        return Solution(
            assignments=[Assignment(a.pickupspot_id, a.vehicle_id, a.workers) for a in self.assignments],
            fitness=self.fitness,
            total_cost=self.total_cost,
            total_distance=self.total_distance,
            vehicles_used=self.vehicles_used
        )

class AdvancedVRPSolver:
    """
    Advanced VRP Solver with:
    - Cost minimization
    - Smart vehicle selection (prefer single vehicle per pickup spot)
    - Capacity-aware assignments
    - ALNS + Genetic Algorithm hybrid
    """
    
    def __init__(self, factory: Factory, vehicles: List[Vehicle], pickupspots: List[PickupSpot], use_real_roads: bool = True):
        self.factory = factory
        self.vehicles = sorted(vehicles, key=lambda v: v.cost_per_km)  # Sort by cost efficiency
        self.pickupspots = pickupspots
        self.use_real_roads = use_real_roads  # Use OSRM for real road distances
        
        # Precompute distances
        self.distances = self._compute_distances()
        
        # Vehicle colors
        self.colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", 
                      "#F7DC6F", "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA"]
    
    def _compute_distances(self) -> Dict:
        """Precompute all distances using OSRM if enabled"""
        distances = {}
        factory_pos = (self.factory.latitude, self.factory.longitude)
        
        print(f"📍 Computing distances (use_real_roads={self.use_real_roads})...")
        
        for pickupspot in self.pickupspots:
            pickupspot_pos = (pickupspot.latitude, pickupspot.longitude)
            distances[('factory', pickupspot.id)] = calculate_distance_with_osrm(
                self.factory.latitude, self.factory.longitude,
                pickupspot.latitude, pickupspot.longitude,
                use_osrm=self.use_real_roads
            )
            
        for i, pickupspot1 in enumerate(self.pickupspots):
            for pickupspot2 in self.pickupspots[i+1:]:
                dist = calculate_distance_with_osrm(
                    pickupspot1.latitude, pickupspot1.longitude,
                    pickupspot2.latitude, pickupspot2.longitude,
                    use_osrm=self.use_real_roads
                )
                distances[(pickupspot1.id, pickupspot2.id)] = dist
                distances[(pickupspot2.id, pickupspot1.id)] = dist
        
        print(f"✅ Distance computation complete\n")
        return distances
    
    def solve(self, generations: int = 200) -> Optional[OptimizationResult]:
        """
        Solve VRP with ALNS optimization (no genetic algorithm)
        
        Strategy:
        1. Create greedy initial solution (cost-optimized)
        2. Improve with ALNS (destroy and repair)
        3. Consolidate routes to minimize vehicles
        """
        
        print(f"\n🎯 Advanced VRP Solver Starting...")
        print(f"   Vehicles: {len(self.vehicles)}, Pickup Spots: {len(self.pickupspots)}")
        print(f"   Total demand: {sum(d.worker_count for d in self.pickupspots)} workers")
        print(f"   Total capacity: {sum(v.capacity for v in self.vehicles)} seats\n")
        
        # Step 1: Create intelligent initial solution
        best_solution = self._create_greedy_solution()
        print(f"   Initial greedy solution: Cost={best_solution.total_cost:.0f} PKR, "
              f"Distance={best_solution.total_distance:.1f} km, Vehicles={best_solution.vehicles_used}")
        
        # Step 2: Improve with ALNS
        print(f"   Running ALNS optimization...")
        for iteration in range(100):  # 100 ALNS iterations
            improved = self._apply_alns_iteration(best_solution)
            if improved and improved.total_cost < best_solution.total_cost:
                best_solution = improved
                if iteration % 20 == 0:
                    print(f"   Iteration {iteration}: Cost={best_solution.total_cost:.0f} PKR, "
                          f"Distance={best_solution.total_distance:.1f} km, Vehicles={best_solution.vehicles_used}")
        
        # Step 3: Final consolidation
        print(f"   Applying final route consolidation...")
        best_solution = self._consolidate_routes(best_solution)
        
        print(f"\n   ✅ Final solution: Cost={best_solution.total_cost:.0f} PKR, "
              f"Distance={best_solution.total_distance:.1f} km, Vehicles={best_solution.vehicles_used}\n")
        
        return self._convert_to_result(best_solution)
    
    def _create_greedy_solution(self) -> Solution:
        """
        Create greedy solution with cost optimization:
        - Sort vehicles by cost efficiency (cost_per_km)
        - Use minimum number of vehicles
        - Fill vehicles to maximum capacity
        - Prefer cheaper vehicles
        """
        solution = Solution()
        
        # Sort vehicles by cost efficiency (cheapest first)
        sorted_vehicles = sorted(self.vehicles, key=lambda v: v.cost_per_km)
        
        # Sort pickup spots by worker count (largest first for better bin packing)
        sorted_pickupspots = sorted(self.pickupspots, key=lambda d: d.worker_count, reverse=True)
        
        # Try to minimize number of vehicles used
        # Strategy: Fill each vehicle to maximum capacity before using next vehicle
        
        unassigned_pickupspots = sorted_pickupspots.copy()
        
        for vehicle in sorted_vehicles:
            if not unassigned_pickupspots:
                break  # All pickup spots assigned
            
            vehicle_load = 0
            vehicle_pickupspots = []
            
            # Try to fill this vehicle with pickup spots
            remaining_pickupspots = []
            
            for pickupspot in unassigned_pickupspots:
                if vehicle_load + pickupspot.worker_count <= vehicle.capacity:
                    # Entire pickup spot fits
                    vehicle_pickupspots.append(pickupspot)
                    solution.assignments.append(Assignment(
                        pickupspot_id=pickupspot.id,
                        vehicle_id=vehicle.id,
                        workers=pickupspot.worker_count
                    ))
                    vehicle_load += pickupspot.worker_count
                elif vehicle_load < vehicle.capacity:
                    # Partial pickup spot assignment (pickup spot splitting)
                    available_space = vehicle.capacity - vehicle_load
                    solution.assignments.append(Assignment(
                        pickupspot_id=pickupspot.id,
                        vehicle_id=vehicle.id,
                        workers=available_space
                    ))
                    vehicle_load += available_space
                    
                    # Create a "partial pickup spot" for remaining workers
                    remaining_workers = pickupspot.worker_count - available_space
                    partial_pickupspot = PickupSpot(
                        id=pickupspot.id,
                        name=pickupspot.name,
                        latitude=pickupspot.latitude,
                        longitude=pickupspot.longitude,
                        worker_count=remaining_workers
                    )
                    remaining_pickupspots.append(partial_pickupspot)
                else:
                    # Vehicle full, keep pickup spot for next vehicle
                    remaining_pickupspots.append(pickupspot)
            
            unassigned_pickupspots = remaining_pickupspots
        
        # Check if all workers assigned
        total_assigned = sum(a.workers for a in solution.assignments)
        total_workers = sum(d.worker_count for d in self.pickupspots)
        
        if total_assigned < total_workers:
            print(f"   ⚠️  Warning: Only assigned {total_assigned}/{total_workers} workers")
        
        self._evaluate_solution(solution)
        return solution
    
    def _is_valid_solution(self, solution: Solution) -> bool:
        """Check if solution is valid with detailed logging"""
        # Check capacity constraints
        vehicle_loads = {v.id: 0 for v in self.vehicles}
        for assignment in solution.assignments:
            vehicle_loads[assignment.vehicle_id] += assignment.workers
        
        for vehicle in self.vehicles:
            load = vehicle_loads[vehicle.id]
            if load > vehicle.capacity:
                print(f"   ❌ CAPACITY VIOLATION: {vehicle.name} has {load} workers but capacity is {vehicle.capacity}")
                return False
        
        # Check all workers assigned
        pickupspot_assigned = {d.id: 0 for d in self.pickupspots}
        for assignment in solution.assignments:
            pickupspot_assigned[assignment.pickupspot_id] += assignment.workers
        
        for pickupspot in self.pickupspots:
            assigned = pickupspot_assigned[pickupspot.id]
            expected = pickupspot.worker_count
            if assigned != expected:
                print(f"   ❌ WORKER MISMATCH: {pickupspot.name} has {assigned} assigned but needs {expected}")
                return False
        
        return True
    
    def _evaluate_solution(self, solution: Solution):
        """
        Calculate cost and fitness of solution
        - Penalize using more vehicles (prefer fewer vehicles)
        - Consider both distance cost and vehicle count
        """
        # Group assignments by vehicle
        vehicle_routes = {v.id: [] for v in self.vehicles}
        for assignment in solution.assignments:
            vehicle_routes[assignment.vehicle_id].append(assignment)
        
        total_cost = 0.0
        total_distance = 0.0
        vehicles_used = 0
        
        for vehicle in self.vehicles:
            if not vehicle_routes[vehicle.id]:
                continue
                
            vehicles_used += 1
            
            # Get unique pickup spots for this vehicle
            pickupspot_ids = list(set(a.pickupspot_id for a in vehicle_routes[vehicle.id]))
            
            # Calculate route distance (TSP for this vehicle's pickup spots)
            route_distance = self._calculate_route_distance(pickupspot_ids)
            
            # Calculate cost
            route_cost = route_distance * vehicle.cost_per_km
            
            total_distance += route_distance
            total_cost += route_cost
        
        solution.total_cost = total_cost
        solution.total_distance = total_distance
        solution.vehicles_used = vehicles_used
        
        # Fitness function: minimize cost + penalty for extra vehicles
        # Add penalty for each vehicle used to encourage using fewer vehicles
        vehicle_penalty = vehicles_used * 1000  # 1000 PKR penalty per vehicle
        solution.fitness = total_cost + vehicle_penalty
    
    def _calculate_route_distance(self, pickupspot_ids: List[str]) -> float:
        """Calculate total distance for visiting these pickup spots (nearest neighbor TSP)"""
        if not pickupspot_ids:
            return 0.0
        
        # Start from factory
        current = 'factory'
        remaining = pickupspot_ids.copy()
        total_distance = 0.0
        
        # Nearest neighbor
        while remaining:
            nearest = None
            nearest_dist = float('inf')
            
            for pickupspot_id in remaining:
                key = (current, pickupspot_id) if current == 'factory' else (current, pickupspot_id)
                dist = self.distances.get(key, 0)
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest = pickupspot_id
            
            total_distance += nearest_dist
            current = nearest
            remaining.remove(nearest)
        
        # Return to factory
        total_distance += self.distances.get(('factory', current), 0)
        
        return total_distance
    
    def _generate_route_segments(self, stops: List[RouteStop]) -> List[RouteSegment]:
        """
        Generate route segments with OSRM geometry for visualization
        
        Creates segments: Factory -> PickupSpot1 -> PickupSpot2 -> ... -> Factory
        """
        segments = []
        
        if not stops:
            return segments
        
        # Build coordinate list: factory -> pickup spots -> factory
        coordinates = [(self.factory.latitude, self.factory.longitude)]
        for stop in stops:
            coordinates.append((stop.latitude, stop.longitude))
        coordinates.append((self.factory.latitude, self.factory.longitude))
        
        # Get route data with geometry from OSRM
        route_data = get_route_with_geometry(coordinates, use_osrm=self.use_real_roads)
        
        if not route_data or not route_data.get('geometry'):
            # Fallback: create straight-line segments
            for i in range(len(coordinates) - 1):
                from_lat, from_lon = coordinates[i]
                to_lat, to_lon = coordinates[i + 1]
                
                distance = calculate_distance_with_osrm(
                    from_lat, from_lon, to_lat, to_lon, 
                    use_osrm=False  # Use Haversine for fallback
                )
                
                segment = RouteSegment(
                    from_lat=from_lat,
                    from_lng=from_lon,
                    to_lat=to_lat,
                    to_lng=to_lon,
                    distance_km=distance,
                    duration_minutes=(distance / 40.0) * 60.0,  # Assume 40 km/h
                    waypoints=[[from_lon, from_lat], [to_lon, to_lat]]
                )
                segments.append(segment)
        else:
            # Use OSRM geometry and turn-by-turn steps
            geometry = route_data['geometry']  # List of [lon, lat] pairs
            legs = route_data.get('legs', [])
            
            # Keep geometry as [lon, lat] for proper OSRM format
            # This matches what the frontend expects
            waypoints = geometry  # Already in [lon, lat] format
            
            # Extract all turn-by-turn steps from all legs
            all_steps = []
            if legs:
                for leg in legs:
                    for step_data in leg.get('steps', []):
                        step = RouteStep(
                            instruction=step_data.get('instruction', 'Continue'),
                            distance_km=step_data.get('distance_km', 0.0),
                            duration_min=step_data.get('duration_min', 0.0),
                            type=step_data.get('type', 'turn'),
                            modifier=step_data.get('modifier', ''),
                            street_name=step_data.get('name', '') + (' ' + step_data.get('ref', '') if step_data.get('ref') else '')
                        )
                        all_steps.append(step)
            
            # Create a single segment for the entire route with full geometry and steps
            # (The frontend will draw the full polyline and display turn-by-turn)
            segment = RouteSegment(
                from_lat=coordinates[0][0],
                from_lng=coordinates[0][1],
                to_lat=coordinates[-1][0],
                to_lng=coordinates[-1][1],
                distance_km=route_data['distance_km'],
                duration_minutes=route_data['duration_min'],
                waypoints=waypoints,
                steps=all_steps
            )
            segments.append(segment)
        
        return segments
    
    def _consolidate_routes(self, solution: Solution) -> Solution:
        """
        Consolidate routes to use fewer vehicles:
        - Try to merge underutilized vehicles
        - Prefer cheaper vehicles
        - Minimize total number of vehicles
        - STRICT CAPACITY ENFORCEMENT
        """
        # Group assignments by vehicle
        vehicle_loads = {}
        vehicle_assignments = {}
        
        for vehicle in self.vehicles:
            vehicle_assignments[vehicle.id] = [a for a in solution.assignments if a.vehicle_id == vehicle.id]
            vehicle_loads[vehicle.id] = sum(a.workers for a in vehicle_assignments[vehicle.id])
        
        # Sort vehicles by cost (cheapest first)
        sorted_vehicles = sorted(self.vehicles, key=lambda v: v.cost_per_km)
        
        # Try to consolidate: move assignments from expensive vehicles to cheaper ones
        consolidated = Solution()
        used_vehicles = set()
        
        for pickupspot in self.pickupspots:
            pickupspot_assignments = [a for a in solution.assignments if a.pickupspot_id == pickupspot.id]
            total_workers = sum(a.workers for a in pickupspot_assignments)
            
            # Try to assign to a single cheap vehicle
            assigned = False
            for vehicle in sorted_vehicles:
                current_load = sum(a.workers for a in consolidated.assignments if a.vehicle_id == vehicle.id)
                
                # STRICT CHECK: Don't exceed capacity
                if current_load + total_workers <= vehicle.capacity:
                    consolidated.assignments.append(Assignment(
                        pickupspot_id=pickupspot.id,
                        vehicle_id=vehicle.id,
                        workers=total_workers
                    ))
                    used_vehicles.add(vehicle.id)
                    assigned = True
                    break
            
            # If can't fit in one vehicle, split across multiple
            if not assigned:
                remaining = total_workers
                for vehicle in sorted_vehicles:
                    if remaining <= 0:
                        break
                    current_load = sum(a.workers for a in consolidated.assignments if a.vehicle_id == vehicle.id)
                    available = vehicle.capacity - current_load
                    
                    if available > 0:
                        pickup = min(remaining, available)
                        consolidated.assignments.append(Assignment(
                            pickupspot_id=pickupspot.id,
                            vehicle_id=vehicle.id,
                            workers=pickup
                        ))
                        used_vehicles.add(vehicle.id)
                        remaining -= pickup
                
                # Safety check: ensure all workers assigned
                if remaining > 0:
                    print(f"   ⚠️  ERROR: Could not assign {remaining} workers from {pickupspot.name}")
                    return solution  # Return original if consolidation fails
        
        # MANDATORY VALIDATION
        if not self._is_valid_solution(consolidated):
            print(f"   ⚠️  Consolidation failed validation - keeping original solution")
            return solution
        
        # Double-check capacity constraints before accepting
        vehicle_loads_check = {v.id: 0 for v in self.vehicles}
        for assignment in consolidated.assignments:
            vehicle_loads_check[assignment.vehicle_id] += assignment.workers
        
        for vehicle in self.vehicles:
            if vehicle_loads_check[vehicle.id] > vehicle.capacity:
                print(f"   ⚠️  CAPACITY VIOLATION in {vehicle.name}: {vehicle_loads_check[vehicle.id]} > {vehicle.capacity}")
                return solution
        
        self._evaluate_solution(consolidated)
        
        # Only use consolidated if it's valid AND better
        if consolidated.total_cost < solution.total_cost or consolidated.vehicles_used < solution.vehicles_used:
            print(f"   ✅ Consolidated: {solution.vehicles_used} → {consolidated.vehicles_used} vehicles, "
                  f"Cost: {solution.total_cost:.0f} → {consolidated.total_cost:.0f} PKR")
            return consolidated
        
        return solution
    
    def _apply_alns_iteration(self, solution: Solution) -> Optional[Solution]:
        """
        Apply single ALNS iteration: destroy and repair
        
        Destroy operators:
        - Random removal: Remove random pickup spot assignments
        - Worst removal: Remove most expensive pickup spot assignments
        - Related removal: Remove nearby pickup spots
        
        Repair operators:
        - Greedy insertion: Insert at cheapest position
        - Regret insertion: Insert where delay cost is highest
        """
        current = solution.copy()
        
        # Choose destroy operator
        destroy_type = random.choice(['random', 'worst', 'related'])
        destroy_count = random.randint(2, min(5, len(self.pickupspots)))
        
        destroyed_pickupspots = set()
        
        if destroy_type == 'random':
            # Random removal
            pickupspots_to_remove = random.sample([d.id for d in self.pickupspots], destroy_count)
            destroyed_pickupspots = set(pickupspots_to_remove)
            
        elif destroy_type == 'worst':
            # Remove most expensive pickup spot assignments
            pickupspot_costs = {}
            for pickupspot in self.pickupspots:
                pickupspot_assignments = [a for a in current.assignments if a.pickupspot_id == pickupspot.id]
                if pickupspot_assignments:
                    # Estimate cost for this pickup spot
                    dist = self.distances.get(('factory', pickupspot.id), 0) * 2
                    vehicles_used = len(set(a.vehicle_id for a in pickupspot_assignments))
                    avg_cost_per_km = sum(v.cost_per_km for v in self.vehicles) / len(self.vehicles)
                    pickupspot_costs[pickupspot.id] = dist * avg_cost_per_km * vehicles_used
            
            # Remove most expensive
            sorted_pickupspots = sorted(pickupspot_costs.items(), key=lambda x: x[1], reverse=True)
            destroyed_pickupspots = set([d[0] for d in sorted_pickupspots[:destroy_count]])
        
        else:  # related
            # Remove nearby pickup spots (clustering)
            if self.pickupspots:
                seed_pickupspot = random.choice(self.pickupspots)
                destroyed_pickupspots = {seed_pickupspot.id}
                
                # Find nearby pickup spots
                while len(destroyed_pickupspots) < destroy_count and len(destroyed_pickupspots) < len(self.pickupspots):
                    nearest = None
                    nearest_dist = float('inf')
                    for pickupspot in self.pickupspots:
                        if pickupspot.id not in destroyed_pickupspots:
                            dist = sum(self.distances.get((d_id, pickupspot.id), float('inf')) 
                                     for d_id in destroyed_pickupspots)
                            if dist < nearest_dist:
                                nearest_dist = dist
                                nearest = pickupspot.id
                    if nearest:
                        destroyed_pickupspots.add(nearest)
        
        # Destroy: remove selected pickup spots
        current.assignments = [a for a in current.assignments if a.pickupspot_id not in destroyed_pickupspots]
        
        # Repair: re-insert with greedy cheapest insertion
        sorted_vehicles = sorted(self.vehicles, key=lambda v: v.cost_per_km)
        
        for pickupspot_id in destroyed_pickupspots:
            pickupspot = next(d for d in self.pickupspots if d.id == pickupspot_id)
            remaining = pickupspot.worker_count
            
            # Try to fit in single vehicle first
            for vehicle in sorted_vehicles:
                current_load = sum(a.workers for a in current.assignments if a.vehicle_id == vehicle.id)
                available = vehicle.capacity - current_load
                
                if available >= remaining:
                    # Fits in one vehicle
                    current.assignments.append(Assignment(
                        pickupspot_id=pickupspot.id,
                        vehicle_id=vehicle.id,
                        workers=remaining
                    ))
                    remaining = 0
                    break
            
            # If doesn't fit in one, split across multiple
            if remaining > 0:
                for vehicle in sorted_vehicles:
                    if remaining <= 0:
                        break
                    current_load = sum(a.workers for a in current.assignments if a.vehicle_id == vehicle.id)
                    available = vehicle.capacity - current_load
                    if available > 0:
                        pickup = min(remaining, available)
                        current.assignments.append(Assignment(
                            pickupspot_id=pickupspot.id,
                            vehicle_id=vehicle.id,
                            workers=pickup
                        ))
                        remaining -= pickup
        
        # Validate and return
        if self._is_valid_solution(current):
            self._evaluate_solution(current)
            return current
        
        return None
    
    def _convert_to_result(self, solution: Solution) -> OptimizationResult:
        """Convert solution to OptimizationResult"""
        # Group assignments by vehicle
        vehicle_assignments = {v.id: [] for v in self.vehicles}
        for assignment in solution.assignments:
            vehicle_assignments[assignment.vehicle_id].append(assignment)
        
        routes = []
        
        for i, vehicle in enumerate(self.vehicles):
            if not vehicle_assignments[vehicle.id]:
                continue
            
            # Get unique pickup spots and total workers
            pickupspot_workers = {}
            for assignment in vehicle_assignments[vehicle.id]:
                if assignment.pickupspot_id not in pickupspot_workers:
                    pickupspot_workers[assignment.pickupspot_id] = 0
                pickupspot_workers[assignment.pickupspot_id] += assignment.workers
            
            # Create route stops
            stops = []
            cumulative_load = 0
            
            for order, (pickupspot_id, workers) in enumerate(pickupspot_workers.items(), 1):
                pickupspot = next(d for d in self.pickupspots if d.id == pickupspot_id)
                cumulative_load += workers
                
                stop = RouteStop(
                    pickupspot_id=pickupspot.id,
                    pickupspot_name=pickupspot.name,
                    latitude=pickupspot.latitude,
                    longitude=pickupspot.longitude,
                    worker_count=workers,
                    arrival_order=order,
                    cumulative_load=cumulative_load,
                    pickup_details=f"Picked up {workers} workers"
                )
                stops.append(stop)
            
            # Calculate metrics
            pickupspot_ids = list(pickupspot_workers.keys())
            route_distance = self._calculate_route_distance(pickupspot_ids)
            route_cost = route_distance * vehicle.cost_per_km
            total_workers = sum(pickupspot_workers.values())
            utilization = (total_workers / vehicle.capacity) * 100
            
            # Generate route segments with OSRM geometry
            route_segments = self._generate_route_segments(stops)
            total_duration = sum(seg.duration_minutes for seg in route_segments)
            
            route = OptimizedRoute(
                vehicle_id=vehicle.id,
                vehicle_name=vehicle.name,
                vehicle_type=vehicle.vehicle_type,
                stops=stops,
                total_distance_km=route_distance,
                total_cost=route_cost,
                utilization_percent=utilization,
                route_color=self.colors[i % len(self.colors)],
                max_passengers=total_workers,
                route_segments=route_segments,
                total_duration_minutes=total_duration
            )
            routes.append(route)
        
        return OptimizationResult(
            routes=routes,
            total_distance=solution.total_distance,
            total_cost=solution.total_cost,
            total_vehicles_used=solution.vehicles_used,
            unassigned_pickupspots=[]
        )

def solve_vrp_advanced(factory: Factory, vehicles: List[Vehicle], pickupspots: List[PickupSpot],
                      use_real_roads: bool = True, generations: int = 200) -> Optional[OptimizationResult]:
    """
    Solve VRP with advanced optimization
    
    Features:
    - Minimizes total cost
    - Prefers single vehicle per pickup spot
    - Smart vehicle selection
    - ALNS + Genetic Algorithm hybrid
    - OSRM real road routing when enabled
    
    Args:
        factory: Factory location
        vehicles: Available vehicles
        pickupspots: Pickup spots
        use_real_roads: Whether to use OSRM for real road distances (True) or Haversine (False)
        generations: Number of optimization iterations
    """
    solver = AdvancedVRPSolver(factory, vehicles, pickupspots, use_real_roads=use_real_roads)
    return solver.solve(generations=generations)
