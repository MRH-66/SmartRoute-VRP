# SmartRoute - Employee Transport Optimizer

A comprehensive Vehicle Routing Problem (VRP) solution for optimizing employee transport from multiple pickup pickup_spots to a central factory location. Built with FastAPI backend and modern web frontend.

## 🚀 Features

### Core Functionality
- **Factory Configuration**: Set and manage central factory location
- **Vehicle Fleet Management**: Add multiple vehicles with different capacities and cost structures
- **PickupSpot Management**: Configure multiple employee pickup locations
- **Route Optimization**: Advanced VRP solving using Adaptive Large Neighborhood Search (ALNS)
- **Interactive Maps**: Click-to-place locations using Leaflet maps with route visualization
- **Bulk Data Entry**: Add multiple vehicles and pickup_spots efficiently
- **Visual Route Display**: Color-coded routes on interactive maps with detailed popups

### Technical Highlights
- **Strict Capacity Validation**: Prevents over-capacity violations with detailed logging
- **ALNS Optimization**: 100 iterations of destroy/repair operators for high-quality solutions
- **Smart Route Consolidation**: Minimizes number of vehicles while respecting constraints
- **Cost Optimization**: Prioritizes self-owned vehicles over rented ones
- **Real-time Validation**: Client-side and server-side data validation
- **Responsive Design**: Works on desktop and mobile devices
- **RESTful API**: Clean separation between frontend and backend

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern, fast web framework for Python APIs
- **ALNS Algorithm**: Adaptive Large Neighborhood Search for route optimization
- **Pydantic**: Data validation and settings management
- **Python 3.8+**: Core programming language

### Frontend
- **HTML5/CSS3/JavaScript**: Modern web technologies
- **Bootstrap 5**: Responsive UI framework
- **Leaflet**: Interactive mapping library with route visualization
- **Fetch API**: Modern HTTP client for API communication

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🚀 Installation & Setup

### 1. Clone or Download the Project
```bash
# If using git
git clone <repository-url>
cd VRP

# Or download and extract the project files to a directory
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the Application
```bash
python run.py
```

### 4. Open in Browser
Navigate to: `http://localhost:8000`

## 📖 Usage Guide

### Step 1: Configure Factory Location
1. Click on "Factory" tab
2. Click on the map to set factory location
3. Enter factory name
4. Save configuration

### Step 2: Add Vehicles
1. Go to "Vehicles" tab
2. Use "Add Vehicle" form for single entries
3. Use "Bulk Add Vehicles" for multiple vehicles
4. Configure: Name, Type (Self-owned/Rented), Capacity, Cost per km

### Step 3: Add PickupSpots
1. Go to "PickupSpots" tab
2. Use "Add PickupSpot" form for single entries
3. Use "Bulk Add PickupSpots" for multiple pickup_spots
4. Configure: Name, Employee count, Location (click on map)

### Step 4: Optimize Routes
1. Go to "Optimization" tab
2. Click "Optimize Routes"
3. View results: routes, costs, distances, utilization
4. See color-coded routes on the map with detailed information

### Step 5: Explore Route Details
1. Click on any route line to see pickup_spot and vehicle information
2. Review total cost, distance, and capacity utilization
3. Export results to CSV or PDF for reporting

## 🔧 Configuration Options

### Vehicle Types
- **Self-owned**: Lower cost for optimization (default: 10 PKR/km)
- **Rented**: Higher cost penalty to minimize usage (default: 15 PKR/km)

### Capacity Constraints
- **Strict Validation**: Routes are validated to prevent over-capacity violations
- **Smart Consolidation**: System attempts to minimize vehicles used while respecting limits
- **Detailed Logging**: Provides warnings for any constraint violations
- **Worker Assignment**: Each pickup_spot's workers assigned to single vehicle for efficiency

### Optimization Algorithm
- **ALNS Method**: Adaptive Large Neighborhood Search with 100 iterations
- **Greedy Initialization**: Fast initial solution construction
- **Destroy/Repair Operators**: Iteratively improves routes by removing and reinserting pickup_spots
- **Vehicle Penalty**: 1000 PKR per vehicle to encourage route consolidation
- **Distance Calculation**: Haversine formula for accurate geographic distances

## 🗂️ Project Structure

```
VRP/
├── api.py                      # FastAPI backend application
├── run.py                      # Application startup script
├── requirements.txt            # Python dependencies
├── models/
│   └── data_models.py         # Data models and schemas
├── utils/
│   ├── advanced_vrp_solver.py # ALNS optimization algorithm
│   ├── distance_utils.py      # Distance calculation utilities
│   └── export_utils.py        # CSV/PDF export functionality
└── frontend/
    ├── index.html             # Main application interface
    ├── css/
    │   └── style.css          # Application styling
    └── js/
        ├── api.js             # API client and utilities
        └── app.js             # Main application logic with map visualization
```

## 🔍 API Documentation

Once the application is running, visit:
- **Interactive API Docs**: `http://localhost:8000/docs`
- **API Schema**: `http://localhost:8000/redoc`

### Key Endpoints
- `GET /api/config` - Get current configuration
- `POST /api/factory` - Set factory location
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Add single vehicle
- `POST /api/vehicles/bulk` - Add multiple vehicles
- `GET /api/pickup_spots` - List all pickup_spots
- `POST /api/pickup_spots` - Add single pickup_spot
- `POST /api/pickup_spots/bulk` - Add multiple pickup_spots
- `POST /api/optimize` - Run route optimization
- `GET /api/export/csv` - Export results to CSV
- `GET /api/export/pdf` - Export results to PDF

## ⚠️ Troubleshooting

### Common Issues

1. **"Import uvicorn could not be resolved"**
   - Ensure all dependencies are installed: `pip install -r requirements.txt`

2. **"No solution found" or "Capacity violations"**
   - Check if total vehicle capacity >= total employee demand
   - Verify all locations have valid coordinates
   - Review capacity warnings in browser console
   - Ensure no single pickup_spot exceeds maximum vehicle capacity

3. **"Some workers unassigned"**
   - Total demand exceeds available capacity
   - Add more vehicles or increase vehicle capacities
   - Check detailed logs for specific capacity issues

4. **Map not loading**
   - Ensure internet connection for map tiles
   - Check browser console for JavaScript errors

5. **Routes not showing on map**
   - Ensure optimization has been run successfully
   - Check that pickup_spot map is visible
   - Verify browser console for visualization errors

### Performance Tips
- Use bulk addition for multiple vehicles/pickup_spots
- ALNS algorithm typically solves in 1-5 seconds for most problems
- Regularly clear browser cache if experiencing issues
- Review capacity constraints before optimization to avoid issues

## 🚗 Example Scenarios

### Small Company (5 vehicles, 10 pickup_spots)
- Typical solving time: 1-2 seconds
- Algorithm: ALNS with 100 iterations

### Medium Company (15 vehicles, 30 pickup_spots)
- Typical solving time: 2-4 seconds
- Algorithm: ALNS with 100 iterations

### Large Company (30+ vehicles, 50+ pickup_spots)
- Typical solving time: 3-6 seconds
- Algorithm: ALNS with 100 iterations

## 🎯 Algorithm Details

### ALNS (Adaptive Large Neighborhood Search)
The system uses a sophisticated ALNS algorithm with the following characteristics:

1. **Greedy Initial Solution**: Fast construction of initial routes
2. **Destroy Operators**: 
   - Random removal of pickup_spots from routes
   - Worst-cost pickup_spot removal
3. **Repair Operators**:
   - Greedy insertion with capacity validation
   - Cost-based placement
4. **Acceptance Criteria**: Simulated annealing-style acceptance
5. **Route Consolidation**: Post-optimization vehicle minimization

### Cost Function
- Distance cost: `distance × cost_per_km`
- Vehicle penalty: 1000 PKR per vehicle used
- Total cost = sum of all route costs + vehicle penalties

## 🔄 Future Enhancements

- **Database Integration**: Persistent data storage (PostgreSQL/MongoDB)
- **Real-time Tracking**: GPS integration for live vehicle tracking
- **Advanced Routing**: Time windows and multi-day planning
- **Enhanced Algorithms**: Multiple algorithm options (Genetic, OR-Tools)
- **User Management**: Multi-tenant support with authentication
- **Mobile App**: Native mobile application
- **Historical Analytics**: Route performance tracking over time
- **Driver Assignment**: Automatic driver-to-vehicle assignment

## 📄 License

This project is developed for educational and commercial use.

## 🤝 Support

For issues, questions, or feature requests:
1. Check the troubleshooting section above
2. Review API documentation at `/docs`
3. Verify all dependencies are properly installed

---

**SmartRoute** - Optimizing employee transport with intelligent routing algorithms.