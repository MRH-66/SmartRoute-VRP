"""
SmartRoute API Backend
FastAPI-based REST API for VRP optimization
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn
import json
import uuid
from pathlib import Path

# Import our models and utilities
from models.data_models import (
    Vehicle, VehicleType, PickupSpot, Factory, 
    OptimizationResult, AppConfiguration
)
from utils.advanced_vrp_solver import solve_vrp_advanced
from utils.export_utils import export_results_to_csv, export_results_to_pdf

app = FastAPI(
    title="SmartRoute API",
    description="Employee Transport Optimization API",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (HTML, CSS, JS)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# In-memory storage (in production, use a database)
app_state = {
    "configurations": {},  # session_id -> AppConfiguration
    "active_session": None
}

# Pydantic models for API requests/responses
class VehicleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    vehicle_type: str = Field(..., pattern="^(Self-owned|Rented)$")
    capacity: int = Field(..., gt=0, le=100)
    cost_per_km: float = Field(..., gt=0, le=1000)

class BulkVehicleItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    vehicle_type: str = Field(..., pattern="^(Self-owned|Rented)$")
    capacity: int = Field(..., gt=0, le=100)
    cost_per_km: float = Field(..., gt=0, le=1000)

class VehicleResponse(BaseModel):
    id: str
    name: str
    vehicle_type: str
    capacity: int
    cost_per_km: float

class PickupSpotRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    worker_count: int = Field(..., ge=1, le=500)

class PickupSpotResponse(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    worker_count: int

class FactoryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class FactoryResponse(BaseModel):
    name: str
    latitude: float
    longitude: float

class OptimizationRequest(BaseModel):
    time_limit: int = Field(default=30, ge=10, le=300)
    use_osrm: bool = Field(default=False)
    algorithm: str = Field(default="advanced", pattern="^(ortools|genetic|advanced)$")
    population_size: int = Field(default=100, ge=50, le=500)
    generations: int = Field(default=300, ge=100, le=1000)
    use_real_roads: bool = Field(default=True)

class BulkPickupSpotRequest(BaseModel):
    pickup_spots: List[PickupSpotRequest]

class BulkVehicleRequest(BaseModel):
    vehicles: List[BulkVehicleItem]

# Helper functions
def get_session_config(session_id: str = "default") -> AppConfiguration:
    """Get or create configuration for session"""
    if session_id not in app_state["configurations"]:
        app_state["configurations"][session_id] = AppConfiguration()
    return app_state["configurations"][session_id]

def validate_session(session_id: str = "default"):
    """Validate session exists"""
    if session_id not in app_state["configurations"]:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_id

# Root endpoint - serve the main HTML page
@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main application page"""
    html_file = Path("frontend/index.html")
    if html_file.exists():
        return FileResponse("frontend/index.html")
    else:
        return HTMLResponse("""
        <html>
            <head><title>SmartRoute</title></head>
            <body>
                <h1>SmartRoute API is running!</h1>
                <p>Frontend files not found. Please check frontend/ directory.</p>
                <a href="/docs">View API Documentation</a>
            </body>
        </html>
        """)

# Configuration endpoints
@app.get("/api/config/{session_id}")
async def get_configuration(session_id: str = "default"):
    """Get current configuration"""
    config = get_session_config(session_id)
    return {
        "factory": config.factory.to_dict() if config.factory else None,
        "vehicles": [v.to_dict() for v in config.vehicles],
        "pickup_spots": [d.to_dict() for d in config.pickupspots],
        "is_complete": config.is_complete(),
        "progress_step": config.get_progress_step()
    }

@app.delete("/api/config/{session_id}")
async def clear_configuration(session_id: str = "default"):
    """Clear all configuration"""
    app_state["configurations"][session_id] = AppConfiguration()
    return {"message": "Configuration cleared"}

# Factory endpoints
@app.post("/api/factory/{session_id}", response_model=FactoryResponse)
async def set_factory(factory_data: FactoryRequest, session_id: str = "default"):
    """Set factory location"""
    config = get_session_config(session_id)
    
    config.factory = Factory(
        name=factory_data.name,
        latitude=factory_data.latitude,
        longitude=factory_data.longitude
    )
    
    return FactoryResponse(
        name=config.factory.name,
        latitude=config.factory.latitude,
        longitude=config.factory.longitude
    )

@app.get("/api/factory/{session_id}", response_model=Optional[FactoryResponse])
async def get_factory(session_id: str = "default"):
    """Get factory location"""
    config = get_session_config(session_id)
    if config.factory:
        return FactoryResponse(
            name=config.factory.name,
            latitude=config.factory.latitude,
            longitude=config.factory.longitude
        )
    return None

@app.delete("/api/factory/{session_id}")
async def delete_factory(session_id: str = "default"):
    """Delete factory location"""
    config = get_session_config(session_id)
    config.factory = None
    return {"message": "Factory deleted"}

# Vehicle endpoints
@app.post("/api/vehicles/{session_id}", response_model=VehicleResponse)
async def add_vehicle(vehicle_data: VehicleRequest, session_id: str = "default"):
    """Add a single vehicle"""
    config = get_session_config(session_id)
    
    # Check for duplicate names
    existing_names = [v.name for v in config.vehicles]
    if vehicle_data.name in existing_names:
        raise HTTPException(status_code=400, detail="Vehicle name already exists")
    
    vehicle = Vehicle(
        id=str(uuid.uuid4()),
        name=vehicle_data.name,
        vehicle_type=VehicleType(vehicle_data.vehicle_type),
        capacity=vehicle_data.capacity,
        cost_per_km=vehicle_data.cost_per_km
    )
    
    config.vehicles.append(vehicle)
    
    return VehicleResponse(
        id=vehicle.id,
        name=vehicle.name,
        vehicle_type=vehicle.vehicle_type.value,
        capacity=vehicle.capacity,
        cost_per_km=vehicle.cost_per_km
    )

@app.post("/api/vehicles/{session_id}/bulk", response_model=List[VehicleResponse])
async def add_multiple_vehicles(vehicles_data: BulkVehicleRequest, session_id: str = "default"):
    """Add multiple vehicles at once"""
    try:
        config = get_session_config(session_id)
        
        existing_names = [v.name for v in config.vehicles]
        new_vehicles = []
        
        # Validate the request data
        if not vehicles_data.vehicles:
            raise HTTPException(status_code=400, detail="No vehicles provided")
        
        for i, vehicle_data in enumerate(vehicles_data.vehicles):
            if vehicle_data.name in existing_names:
                raise HTTPException(status_code=400, detail=f"Vehicle name '{vehicle_data.name}' already exists")
            
            # Handle vehicle type case insensitively
            vehicle_type_str = vehicle_data.vehicle_type.replace("-", "_").upper()
            if vehicle_type_str == "SELF_OWNED":
                vehicle_type = VehicleType.SELF_OWNED
            elif vehicle_type_str == "RENTED":
                vehicle_type = VehicleType.RENTED
            else:
                raise HTTPException(status_code=400, detail=f"Invalid vehicle type: {vehicle_data.vehicle_type}")
        
            vehicle = Vehicle(
                id=str(uuid.uuid4()),
                name=vehicle_data.name,
                vehicle_type=vehicle_type,
                capacity=vehicle_data.capacity,
                cost_per_km=vehicle_data.cost_per_km
            )
        
        config.vehicles.append(vehicle)
        existing_names.append(vehicle_data.name)  # Prevent duplicates within the same request
        
        new_vehicles.append(VehicleResponse(
            id=vehicle.id,
            name=vehicle.name,
            vehicle_type=vehicle.vehicle_type.value,
            capacity=vehicle.capacity,
            cost_per_km=vehicle.cost_per_km
        ))
    
        return new_vehicles
    
    except Exception as e:
        print(f"Error in bulk vehicle addition: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to add vehicles: {str(e)}")

@app.get("/api/vehicles/{session_id}", response_model=List[VehicleResponse])
async def get_vehicles(session_id: str = "default"):
    """Get all vehicles"""
    config = get_session_config(session_id)
    
    return [
        VehicleResponse(
            id=v.id,
            name=v.name,
            vehicle_type=v.vehicle_type.value,
            capacity=v.capacity,
            cost_per_km=v.cost_per_km
        )
        for v in config.vehicles
    ]

@app.put("/api/vehicles/{session_id}/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleRequest, session_id: str = "default"):
    """Update a vehicle"""
    config = get_session_config(session_id)
    
    vehicle = next((v for v in config.vehicles if v.id == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Check for duplicate names (excluding current vehicle)
    existing_names = [v.name for v in config.vehicles if v.id != vehicle_id]
    if vehicle_data.name in existing_names:
        raise HTTPException(status_code=400, detail="Vehicle name already exists")
    
    vehicle.name = vehicle_data.name
    vehicle.vehicle_type = VehicleType(vehicle_data.vehicle_type)
    vehicle.capacity = vehicle_data.capacity
    vehicle.cost_per_km = vehicle_data.cost_per_km
    
    return VehicleResponse(
        id=vehicle.id,
        name=vehicle.name,
        vehicle_type=vehicle.vehicle_type.value,
        capacity=vehicle.capacity,
        cost_per_km=vehicle.cost_per_km
    )

@app.delete("/api/vehicles/{session_id}/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, session_id: str = "default"):
    """Delete a vehicle"""
    config = get_session_config(session_id)
    
    vehicle = next((v for v in config.vehicles if v.id == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    config.vehicles = [v for v in config.vehicles if v.id != vehicle_id]
    return {"message": f"Vehicle '{vehicle.name}' deleted"}

# PickupSpot endpoints
@app.post("/api/pickup_spots/{session_id}", response_model=PickupSpotResponse)
async def add_pickup_spot(pickup_spot_data: PickupSpotRequest, session_id: str = "default"):
    """Add a single pickup_spot"""
    config = get_session_config(session_id)
    
    # Check for duplicate names
    existing_names = [d.name for d in config.pickupspots]
    if pickup_spot_data.name in existing_names:
        raise HTTPException(status_code=400, detail="PickupSpot name already exists")
    
    pickup_spot = PickupSpot(
        id=str(uuid.uuid4()),
        name=pickup_spot_data.name,
        latitude=pickup_spot_data.latitude,
        longitude=pickup_spot_data.longitude,
        worker_count=pickup_spot_data.worker_count
    )
    
    config.pickupspots.append(pickup_spot)
    
    return PickupSpotResponse(
        id=pickup_spot.id,
        name=pickup_spot.name,
        latitude=pickup_spot.latitude,
        longitude=pickup_spot.longitude,
        worker_count=pickup_spot.worker_count
    )

@app.post("/api/pickup_spots/{session_id}/bulk", response_model=List[PickupSpotResponse])
async def add_multiple_pickup_spots(pickup_spots_data: BulkPickupSpotRequest, session_id: str = "default"):
    """Add multiple pickup_spots at once"""
    config = get_session_config(session_id)
    
    existing_names = [d.name for d in config.pickupspots]
    new_pickup_spots = []
    
    for pickup_spot_data in pickup_spots_data.pickup_spots:
        if pickup_spot_data.name in existing_names:
            raise HTTPException(status_code=400, detail=f"PickupSpot name '{pickup_spot_data.name}' already exists")
        
        pickup_spot = PickupSpot(
            id=str(uuid.uuid4()),
            name=pickup_spot_data.name,
            latitude=pickup_spot_data.latitude,
            longitude=pickup_spot_data.longitude,
            worker_count=pickup_spot_data.worker_count
        )
        
        config.pickupspots.append(pickup_spot)
        existing_names.append(pickup_spot_data.name)  # Prevent duplicates within the same request
        
        new_pickup_spots.append(PickupSpotResponse(
            id=pickup_spot.id,
            name=pickup_spot.name,
            latitude=pickup_spot.latitude,
            longitude=pickup_spot.longitude,
            worker_count=pickup_spot.worker_count
        ))
    
    return new_pickup_spots

@app.get("/api/pickup_spots/{session_id}", response_model=List[PickupSpotResponse])
async def get_pickup_spots(session_id: str = "default"):
    """Get all pickup_spots"""
    config = get_session_config(session_id)
    
    return [
        PickupSpotResponse(
            id=d.id,
            name=d.name,
            latitude=d.latitude,
            longitude=d.longitude,
            worker_count=d.worker_count
        )
        for d in config.pickupspots
    ]

@app.put("/api/pickup_spots/{session_id}/{spot_id}", response_model=PickupSpotResponse)
async def update_pickup_spot(spot_id: str, pickup_spot_data: PickupSpotRequest, session_id: str = "default"):
    """Update a pickup_spot"""
    config = get_session_config(session_id)
    
    pickup_spot = next((d for d in config.pickupspots if d.id == spot_id), None)
    if not pickup_spot:
        raise HTTPException(status_code=404, detail="PickupSpot not found")
    
    # Check for duplicate names (excluding current pickup_spot)
    existing_names = [d.name for d in config.pickupspots if d.id != spot_id]
    if pickup_spot_data.name in existing_names:
        raise HTTPException(status_code=400, detail="PickupSpot name already exists")
    
    pickup_spot.name = pickup_spot_data.name
    pickup_spot.latitude = pickup_spot_data.latitude
    pickup_spot.longitude = pickup_spot_data.longitude
    pickup_spot.worker_count = pickup_spot_data.worker_count
    
    return PickupSpotResponse(
        id=pickup_spot.id,
        name=pickup_spot.name,
        latitude=pickup_spot.latitude,
        longitude=pickup_spot.longitude,
        worker_count=pickup_spot.worker_count
    )

@app.delete("/api/pickup_spots/{session_id}/{spot_id}")
async def delete_pickup_spot(spot_id: str, session_id: str = "default"):
    """Delete a pickup_spot"""
    config = get_session_config(session_id)
    
    pickup_spot = next((d for d in config.pickupspots if d.id == spot_id), None)
    if not pickup_spot:
        raise HTTPException(status_code=404, detail="PickupSpot not found")
    
    config.pickupspots = [d for d in config.pickupspots if d.id != spot_id]
    return {"message": f"PickupSpot '{pickup_spot.name}' deleted"}

# Optimization endpoint
@app.post("/api/optimize/{session_id}")
async def optimize_routes(optimization_data: OptimizationRequest, session_id: str = "default"):
    """Optimize routes"""
    config = get_session_config(session_id)
    
    if not config.is_complete():
        missing = []
        if not config.factory:
            missing.append("factory")
        if not config.vehicles:
            missing.append("vehicles")
        if not config.pickupspots:
            missing.append("pickup_spots")
        
        raise HTTPException(
            status_code=400, 
            detail=f"Configuration incomplete. Missing: {', '.join(missing)}"
        )
    
    try:
        # Debug info
        print(f"Starting optimization with {len(config.vehicles)} vehicles and {len(config.pickupspots)} pickup_spots")
        for vehicle in config.vehicles:
            print(f"Vehicle: {vehicle.name}, Capacity: {vehicle.capacity}")
        for pickup_spot in config.pickupspots:
            print(f"PickupSpot: {pickup_spot.name}, Workers: {pickup_spot.worker_count}")
            
        # Run optimization with Advanced Solver (only algorithm available)
        print(f"Using Advanced Solver with cost optimization and smart pickup spot assignment")
        result = solve_vrp_advanced(
            factory=config.factory,
            vehicles=config.vehicles,
            pickupspots=config.pickupspots,
            use_real_roads=optimization_data.use_real_roads
        )
        
        if result:
            config.optimization_result = result
            
            # Debug analysis
            total_assigned = sum(len(route.stops) for route in result.routes)
            total_pickupspots = len(config.pickupspots)
            total_workers_assigned = sum(sum(stop.worker_count for stop in route.stops) for route in result.routes)
            total_workers_available = sum(pickupspot.worker_count for pickupspot in config.pickupspots)
            
            print(f"Analysis: {total_assigned}/{total_pickupspots} pickup spots assigned, {total_workers_assigned}/{total_workers_available} workers")
            
            if result.unassigned_pickupspots:
                print(f"Unassigned pickup spots: {result.unassigned_pickupspots}")
                # Check unused vehicles
                used_vehicle_ids = {route.vehicle_id for route in result.routes}
                unused_vehicles = [v for v in config.vehicles if v.id not in used_vehicle_ids]
                if unused_vehicles:
                    print("Unused vehicles:")
                    for v in unused_vehicles:
                        print(f"  - {v.name}: {v.capacity} capacity")
            
            return result.to_dict()
        else:
            raise HTTPException(status_code=500, detail="Optimization failed")
    
    except Exception as e:
        import traceback
        print(f"Optimization error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

@app.get("/api/results/{session_id}")
async def get_optimization_results(session_id: str = "default"):
    """Get optimization results"""
    config = get_session_config(session_id)
    
    if config.optimization_result:
        return config.optimization_result.to_dict()
    else:
        raise HTTPException(status_code=404, detail="No optimization results found")

# Export endpoints
@app.get("/api/export/{session_id}/csv")
async def export_csv(session_id: str = "default"):
    """Export results as CSV"""
    config = get_session_config(session_id)
    
    if not config.optimization_result:
        raise HTTPException(status_code=404, detail="No optimization results to export")
    
    csv_data = export_results_to_csv(config.optimization_result)
    
    return {
        "filename": f"smartroute_results_{session_id}.csv",
        "content": csv_data,
        "mime_type": "text/csv"
    }

# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "SmartRoute API"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)