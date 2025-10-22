/**
 * SmartRoute Frontend Application
 * Main application logic and UI management
 */

// Global state
let appState = {
    config: null,
    maps: {},
    vehicleFormCount: 0,
    spotFormCount: 0
};

// Route colors for visualization (dark shades for better contrast)
const ROUTE_COLORS = [
    '#C62828', // Dark Red
    '#AD1457', // Dark Pink
    '#6A1B9A', // Dark Purple
    '#4527A0', // Dark Deep Purple
    '#283593', // Dark Indigo
    '#1565C0', // Dark Blue
    '#0277BD', // Dark Light Blue
    '#00838F', // Dark Cyan
    '#00695C', // Dark Teal
    '#2E7D32', // Dark Green
    '#558B2F', // Dark Light Green
    '#9E9D24', // Dark Lime
    '#F9A825', // Dark Yellow
    '#FF8F00', // Dark Amber
    '#EF6C00', // Dark Orange
    '#D84315'  // Dark Deep Orange
];

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('SmartRoute application starting...');
    
    try {
        // Load initial configuration
        await loadConfiguration();
        
        // Initialize maps
        initializeMaps();
        
        // Set up event listeners
        setupEventListeners();
        
        // Update UI
        updateProgressSteps();
        updateDashboard();
        
        console.log('SmartRoute application initialized successfully');
    } catch (error) {
        showError('Failed to initialize application: ' + error.message);
    }
});

// Configuration management
async function loadConfiguration() {
    try {
        appState.config = await api.getConfiguration();
        console.log('Configuration loaded:', appState.config);
    } catch (error) {
        console.error('Failed to load configuration:', error);
        appState.config = {
            factory: null,
            vehicles: [],
            pickup_spots: [],
            is_complete: false,
            progress_step: 1
        };
    }
}

async function saveConfiguration() {
    // Configuration is automatically saved via API calls
    await loadConfiguration();
    updateProgressSteps();
    updateDashboard();
}

// Progress steps management
function updateProgressSteps() {
    const steps = ['factory', 'vehicles', 'pickup-spots', 'optimize'];
    const currentStep = appState.config.progress_step;
    
    steps.forEach((step, index) => {
        const stepElement = document.getElementById(`step-${step}`);
        const stepNumber = index + 1;
        
        if (stepElement) {
            stepElement.classList.remove('completed', 'current');
            
            if (stepNumber < currentStep) {
                stepElement.classList.add('completed');
            } else if (stepNumber === currentStep) {
                stepElement.classList.add('current');
            }
        }
    });
    
    // Update progress lines
    const lines = document.querySelectorAll('.progress-line');
    lines.forEach((line, index) => {
        line.classList.remove('completed');
        if (index + 1 < currentStep) {
            line.classList.add('completed');
        }
    });
}

// Dashboard management
function updateDashboard() {
    updateFactoryStatus();
    updateFleetStatus();
    updatePickupSpotStatus();
    updateOptimizationStatus();
    updateQuickActions();
}

function updateFactoryStatus() {
    const statusElement = document.getElementById('factory-status');
    if (!statusElement) return;
    
    if (appState.config.factory) {
        statusElement.className = 'status-set';
        statusElement.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            ${appState.config.factory.name}
            <br><small>${appState.config.factory.latitude.toFixed(4)}, ${appState.config.factory.longitude.toFixed(4)}</small>
        `;
    } else {
        statusElement.className = 'status-not-set';
        statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Not set';
    }
}

function updateFleetStatus() {
    const statusElement = document.getElementById('fleet-status');
    if (!statusElement) return;
    
    if (appState.config.vehicles.length > 0) {
        const ownedCount = appState.config.vehicles.filter(v => v.vehicle_type === 'Self-owned').length;
        const rentedCount = appState.config.vehicles.filter(v => v.vehicle_type === 'Rented').length;
        const totalCapacity = appState.config.vehicles.reduce((sum, v) => sum + v.capacity, 0);
        
        statusElement.className = 'status-set';
        statusElement.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            ${appState.config.vehicles.length} vehicles (${ownedCount} owned, ${rentedCount} rented)
            <br><small>${totalCapacity} total capacity</small>
        `;
    } else {
        statusElement.className = 'status-not-set';
        statusElement.innerHTML = '<i class="fas fa-times-circle"></i> No vehicles';
    }
}

function updatePickupSpotStatus() {
    const statusElement = document.getElementById('pickup-spots-status');
    if (!statusElement) return;
    
    if (appState.config.pickup_spots.length > 0) {
        const totalWorkers = appState.config.pickup_spots.reduce((sum, d) => sum + d.worker_count, 0);
        
        statusElement.className = 'status-set';
        statusElement.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            ${appState.config.pickup_spots.length} pickupspots
            <br><small>${totalWorkers} total workers</small>
        `;
    } else {
        statusElement.className = 'status-not-set';
        statusElement.innerHTML = '<i class="fas fa-times-circle"></i> No Pickup Spots';
    }
}

function updateOptimizationStatus() {
    const statusElement = document.getElementById('optimization-status');
    if (!statusElement) return;
    
    if (appState.config.is_complete) {
        statusElement.className = 'status-set';
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Ready for optimization';
    } else {
        statusElement.className = 'status-not-set';
        statusElement.innerHTML = '<i class="fas fa-clock"></i> Pending configuration';
    }
}

function updateQuickActions() {
    const actionsElement = document.getElementById('quick-actions');
    if (!actionsElement) return;
    
    let html = '';
    
    if (!appState.config.factory) {
        html = `
            <div class="alert alert-info">
                <h6><i class="fas fa-info-circle"></i> Next Step</h6>
                <p>Set your factory location</p>
                <button class="btn btn-primary" onclick="switchToTab('factory-tab')">
                    <i class="fas fa-industry"></i> Set Factory
                </button>
            </div>
        `;
    } else if (appState.config.vehicles.length === 0) {
        html = `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle"></i> Next Step</h6>
                <p>Configure your vehicle fleet</p>
                <button class="btn btn-primary" onclick="switchToTab('vehicles-tab')">
                    <i class="fas fa-truck"></i> Add Vehicles
                </button>
            </div>
        `;
    } else if (appState.config.pickup_spots.length === 0) {
        html = `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle"></i> Next Step</h6>
                <p>Map pickup locations</p>
                <button class="btn btn-primary" onclick="switchToTab('pickup-spots-tab')">
                    <i class="fas fa-map-marker-alt"></i> Add Pickup Spots
                </button>
            </div>
        `;
    } else {
        html = `
            <div class="alert alert-success">
                <h6><i class="fas fa-rocket"></i> Ready!</h6>
                <p>All configuration complete</p>
                <button class="btn btn-success" onclick="switchToTab('optimization-tab')">
                    <i class="fas fa-calculator"></i> Optimize Routes
                </button>
            </div>
        `;
    }
    
    actionsElement.innerHTML = html;
}

// Map initialization
function initializeMaps() {
    // Factory map
    if (!appState.maps.factory) {
        const factoryMapElement = document.getElementById('factory-map');
        if (factoryMapElement) {
            appState.maps.factory = L.map('factory-map').setView([31.5204, 74.3587], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(appState.maps.factory);
            
            // Click handler for factory location
            appState.maps.factory.on('click', function(e) {
                setFactoryLocation(e.latlng.lat, e.latlng.lng);
            });
        }
    }
    
    // PickupSpot map
    if (!appState.maps.pickupspots) {
        const spotMapElement = document.getElementById('pickup-spot-map');
        if (spotMapElement) {
            appState.maps.pickupspots = L.map('pickup-spot-map').setView([31.5204, 74.3587], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(appState.maps.pickupspots);
            
            // Click handler for pickup spot location
            appState.maps.pickupspots.on('click', function(e) {
                if (appState.config.factory) {
                    setPickupSpotLocation(e.latlng.lat, e.latlng.lng);
                } else {
                    showError('Please set factory location first');
                }
            });
        }
    }
    
    // Update map markers
    updateMapMarkers();
}

function updateMapMarkers() {
    // Clear existing markers
    if (appState.maps.factory) {
        appState.maps.factory.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                appState.maps.factory.removeLayer(layer);
            }
        });
    }
    
    if (appState.maps.pickupspots) {
        appState.maps.pickupspots.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                appState.maps.pickupspots.removeLayer(layer);
            }
        });
    }
    
    // Add factory marker
    if (appState.config.factory) {
        const factoryIcon = L.divIcon({
            html: '<i class="fas fa-industry" style="color: orange; font-size: 20px;"></i>',
            iconSize: [30, 30],
            className: 'custom-div-icon'
        });
        
        if (appState.maps.factory) {
            L.marker([appState.config.factory.latitude, appState.config.factory.longitude], {icon: factoryIcon})
                .addTo(appState.maps.factory)
                .bindPopup(`🏭 ${appState.config.factory.name}`);
        }
        
        if (appState.maps.pickupspots) {
            L.marker([appState.config.factory.latitude, appState.config.factory.longitude], {icon: factoryIcon})
                .addTo(appState.maps.pickupspots)
                .bindPopup(`🏭 ${appState.config.factory.name}`);
        }
    }
    
    // Add pickup spot markers
    appState.config.pickup_spots.forEach(pickupspots => {
        const spotIcon = L.divIcon({
            html: '<i class="fas fa-users" style="color: blue; font-size: 16px;"></i>',
            iconSize: [25, 25],
            className: 'custom-div-icon'
        });
        
        if (appState.maps.pickupspots) {
            L.marker([pickupspots.latitude, pickupspots.longitude], {icon: spotIcon})
                .addTo(appState.maps.pickupspots)
                .bindPopup(`📍 ${pickupspots.name}<br>👥 ${pickupspots.worker_count} workers`);
        }
    });
}

// Event listeners
function setupEventListeners() {
    // Factory form
    const factoryForm = document.getElementById('factoryForm');
    if (factoryForm) {
        factoryForm.addEventListener('submit', handleFactorySubmit);
    }
    
    // Tab change events
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function() {
            // Resize maps when tab becomes visible
            setTimeout(() => {
                if (appState.maps.factory) appState.maps.factory.invalidateSize();
                if (appState.maps.pickupspots) appState.maps.pickupspots.invalidateSize();
            }, 100);
            
            // Update content based on active tab
            const tabId = this.getAttribute('href').substring(1);
            switch(tabId) {
                case 'vehicles':
                    loadVehicles();
                    break;
                case 'pickup-spots':
                    loadPickupSpots();
                    break;
                case 'factory':
                    loadFactory();
                    break;
                case 'optimization':
                    loadOptimization();
                    break;
            }
        });
    });
}

// Factory management
function setFactoryLocation(lat, lng) {
    document.getElementById('factoryLat').value = lat.toFixed(6);
    document.getElementById('factoryLon').value = lng.toFixed(6);
    
    // Clear existing temporary marker
    if (appState.maps.factory) {
        appState.maps.factory.eachLayer(layer => {
            if (layer instanceof L.Marker && layer.options.temporary) {
                appState.maps.factory.removeLayer(layer);
            }
        });
        
        // Add temporary marker
        const tempIcon = L.divIcon({
            html: '<i class="fas fa-map-pin" style="color: red; font-size: 20px;"></i>',
            iconSize: [30, 30],
            className: 'custom-div-icon'
        });
        
        L.marker([lat, lng], {icon: tempIcon, temporary: true})
            .addTo(appState.maps.factory)
            .bindPopup('📍 Click "Set Factory Location" to confirm');
    }
}

async function handleFactorySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const factoryData = {
        name: formData.get('factoryName') || document.getElementById('factoryName').value,
        latitude: parseFloat(document.getElementById('factoryLat').value),
        longitude: parseFloat(document.getElementById('factoryLon').value)
    };
    
    const errors = validateFactory(factoryData);
    if (errors.length > 0) {
        showError(errors.join(', '));
        return;
    }
    
    try {
        await api.setFactory(factoryData);
        await saveConfiguration();
        showSuccess('Factory location set successfully');
        loadFactory();
    } catch (error) {
        showError('Failed to set factory: ' + error.message);
    }
}

function loadFactory() {
    const factoryForm = document.getElementById('factory-form');
    const factoryCurrent = document.getElementById('factory-current');
    const factoryInfo = document.getElementById('factory-info');
    
    if (appState.config.factory) {
        factoryForm.style.display = 'none';
        factoryCurrent.style.display = 'block';
        
        factoryInfo.innerHTML = `
            <div class="alert alert-success">
                <h6>${appState.config.factory.name}</h6>
                <p><i class="fas fa-map-marker-alt"></i> ${appState.config.factory.latitude.toFixed(4)}, ${appState.config.factory.longitude.toFixed(4)}</p>
            </div>
        `;
    } else {
        factoryForm.style.display = 'block';
        factoryCurrent.style.display = 'none';
    }
}

async function changeFactory() {
    try {
        await api.deleteFactory();
        await saveConfiguration();
        loadFactory();
        updateMapMarkers();
        showSuccess('Factory location cleared');
    } catch (error) {
        showError('Failed to change factory: ' + error.message);
    }
}

// Vehicle management - Enhanced for multiple additions
async function loadVehicles() {
    try {
        const vehicles = await api.getVehicles();
        updateVehicleSummary(vehicles);
        updateVehicleList(vehicles);
    } catch (error) {
        showError('Failed to load vehicles: ' + error.message);
    }
}

function updateVehicleSummary(vehicles) {
    const summaryElement = document.getElementById('vehicle-summary');
    if (!summaryElement) return;
    
    const ownedCount = vehicles.filter(v => v.vehicle_type === 'Self-owned').length;
    const rentedCount = vehicles.filter(v => v.vehicle_type === 'Rented').length;
    const totalCapacity = vehicles.reduce((sum, v) => sum + v.capacity, 0);
    const avgCost = vehicles.length > 0 ? vehicles.reduce((sum, v) => sum + v.cost_per_km, 0) / vehicles.length : 0;
    
    summaryElement.innerHTML = `
        <div class="col-md-3">
            <div class="summary-card">
                <h3>${vehicles.length}</h3>
                <p>Total Vehicles</p>
            </div>
        </div>
        <div class="col-md-3">
            <div class="summary-card">
                <h3>${ownedCount}</h3>
                <p>Self-owned</p>
            </div>
        </div>
        <div class="col-md-3">
            <div class="summary-card">
                <h3>${totalCapacity}</h3>
                <p>Total Capacity</p>
            </div>
        </div>
        <div class="col-md-3">
            <div class="summary-card">
                <h3>${formatNumber(avgCost, 1)}</h3>
                <p>Avg Cost/km (PKR)</p>
            </div>
        </div>
    `;
}

function updateVehicleList(vehicles) {
    const listElement = document.getElementById('vehicle-list');
    if (!listElement) return;
    
    if (vehicles.length === 0) {
        listElement.innerHTML = `
            <div class="alert alert-info">
                <h6><i class="fas fa-info-circle"></i> No vehicles configured</h6>
                <p>Add your first vehicle to get started with route optimization.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="row">';
    
    vehicles.forEach(vehicle => {
        const typeClass = vehicle.vehicle_type === 'Self-owned' ? 'vehicle-type-owned' : 'vehicle-type-rented';
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="vehicle-card ${typeClass}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6>${vehicle.name}</h6>
                            <p class="mb-1"><i class="fas fa-tag"></i> ${vehicle.vehicle_type}</p>
                            <p class="mb-1"><i class="fas fa-users"></i> ${vehicle.capacity} seats</p>
                            <p class="mb-0"><i class="fas fa-money-bill"></i> ${vehicle.cost_per_km} PKR/km</p>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="editVehicle('${vehicle.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </a></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="deleteVehicle('${vehicle.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    listElement.innerHTML = html;
}

// Vehicle modal functions
function showAddVehicleModal() {
    // Clear form
    document.getElementById('addVehicleForm').reset();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addVehicleModal'));
    modal.show();
}

async function addVehicle() {
    const form = document.getElementById('addVehicleForm');
    const formData = new FormData(form);
    
    const vehicleData = {
        name: document.getElementById('vehicleName').value,
        vehicle_type: document.getElementById('vehicleType').value,
        capacity: parseInt(document.getElementById('vehicleCapacity').value),
        cost_per_km: parseFloat(document.getElementById('vehicleCost').value)
    };
    
    const errors = validateVehicle(vehicleData);
    if (errors.length > 0) {
        showError(errors.join(', '));
        return;
    }
    
    try {
        await api.addVehicle(vehicleData);
        await saveConfiguration();
        showSuccess(`Vehicle '${vehicleData.name}' added successfully`);
        
        // Close modal and reload
        bootstrap.Modal.getInstance(document.getElementById('addVehicleModal')).hide();
        loadVehicles();
    } catch (error) {
        showError('Failed to add vehicle: ' + error.message);
    }
}

// Bulk vehicle functions
function showBulkVehicleModal() {
    appState.vehicleFormCount = 0;
    const formsContainer = document.getElementById('bulk-vehicle-forms');
    formsContainer.innerHTML = '';
    
    // Add initial forms
    addVehicleForm();
    addVehicleForm();
    addVehicleForm();
    
    const modal = new bootstrap.Modal(document.getElementById('bulkVehicleModal'));
    modal.show();
}

function addVehicleForm() {
    const formsContainer = document.getElementById('bulk-vehicle-forms');
    const formIndex = appState.vehicleFormCount++;
    
    const formHtml = `
        <div class="bulk-form-item" id="vehicle-form-${formIndex}">
            <button type="button" class="remove-btn" onclick="removeVehicleForm(${formIndex})">×</button>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Vehicle Name</label>
                        <input type="text" class="form-control" name="name" placeholder="e.g., Bus-01">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Vehicle Type</label>
                        <select class="form-control" name="vehicle_type">
                            <option value="Self-owned">Self-owned</option>
                            <option value="Rented">Rented</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Capacity (seats)</label>
                        <input type="number" class="form-control" name="capacity" min="1" max="200" value="20">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Cost per KM (PKR)</label>
                        <input type="number" class="form-control" name="cost_per_km" min="0.1" step="0.1" value="25.0">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    formsContainer.insertAdjacentHTML('beforeend', formHtml);
}

function removeVehicleForm(formIndex) {
    const formElement = document.getElementById(`vehicle-form-${formIndex}`);
    if (formElement) {
        formElement.remove();
    }
}

async function addBulkVehicles() {
    const formsContainer = document.getElementById('bulk-vehicle-forms');
    const forms = formsContainer.querySelectorAll('.bulk-form-item');
    const vehiclesData = [];
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select');
        const vehicleData = {};
        
        inputs.forEach(input => {
            if (input.name && input.value.trim() !== '') {
                if (input.type === 'number') {
                    vehicleData[input.name] = parseFloat(input.value);
                } else {
                    vehicleData[input.name] = input.value;
                }
            }
        });
        
        // Only add if all required fields are filled
        if (vehicleData.name && vehicleData.vehicle_type && vehicleData.capacity && vehicleData.cost_per_km) {
            vehiclesData.push(vehicleData);
        }
    });
    
    if (vehiclesData.length === 0) {
        showError('Please fill in at least one complete vehicle form');
        return;
    }
    
    // Validate all vehicles
    const allErrors = [];
    vehiclesData.forEach((vehicle, index) => {
        const errors = validateVehicle(vehicle);
        if (errors.length > 0) {
            allErrors.push(`Vehicle ${index + 1}: ${errors.join(', ')}`);
        }
    });
    
    if (allErrors.length > 0) {
        showError(allErrors.join('\n'));
        return;
    }
    
    try {
        await api.addBulkVehicles(vehiclesData);
        await saveConfiguration();
        showSuccess(`${vehiclesData.length} vehicles added successfully`);
        
        // Close modal and reload
        bootstrap.Modal.getInstance(document.getElementById('bulkVehicleModal')).hide();
        loadVehicles();
    } catch (error) {
        showError('Failed to add vehicles: ' + error.message);
    }
}

async function deleteVehicle(vehicleId) {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
        return;
    }
    
    try {
        await api.deleteVehicle(vehicleId);
        await saveConfiguration();
        showSuccess('Vehicle deleted successfully');
        loadVehicles();
    } catch (error) {
        showError('Failed to delete vehicle: ' + error.message);
    }
}

// Pickup Spot management - Enhanced for multiple additions
async function loadPickupSpots() {
    try {
        const pickupspots = await api.getPickupSpots();
        updatePickupSpotSummary(pickupspots);
        updatePickupSpotList(pickupspots);
        updateMapMarkers();
    } catch (error) {
        showError('Failed to load pickup spots: ' + error.message);
    }
}

function updatePickupSpotSummary(pickupspots) {
    const summaryElement = document.getElementById('pickup-spot-summary');
    if (!summaryElement) return;
    
    const totalWorkers = pickupspots.reduce((sum, d) => sum + d.worker_count, 0);
    const avgWorkers = pickupspots.length > 0 ? totalWorkers / pickupspots.length : 0;
    
    summaryElement.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h6><i class="fas fa-map-marker-alt"></i> PickupSpot Summary</h6>
                <div class="row text-center">
                    <div class="col-6">
                        <h4>${pickupspots.length}</h4>
                        <small>Total PickupSpots</small>
                    </div>
                    <div class="col-6">
                        <h4>${totalWorkers}</h4>
                        <small>Total Workers</small>
                    </div>
                </div>
                <hr>
                <small class="text-muted">Average: ${formatNumber(avgWorkers, 1)} workers per pickup spot</small>
            </div>
        </div>
    `;
}

function updatePickupSpotList(pickupspots) {
    const listElement = document.getElementById('pickup-spot-list');
    if (!listElement) return;
    
    if (pickupspots.length === 0) {
        listElement.innerHTML = `
            <div class="alert alert-info">
                <h6><i class="fas fa-info-circle"></i> No pickup spots configured</h6>
                <p>Click on the map or use the "Add PickupSpot" button to add pickup locations.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="list-group">';
    
    pickupspots.forEach((pickupspot, index) => {
        html += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${pickupspot.name}</h6>
                        <p class="mb-1"><i class="fas fa-users"></i> ${pickupspot.worker_count} workers</p>
                        <small class="text-muted"><i class="fas fa-map-marker-alt"></i> ${pickupspot.latitude.toFixed(4)}, ${pickupspot.longitude.toFixed(4)}</small>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="editPickupSpot('${pickupspot.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </a></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deletePickupSpot('${pickupspot.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </a></li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    listElement.innerHTML = html;
}

function setPickupSpotLocation(lat, lng) {
    document.getElementById('pickupspotLat').value = lat.toFixed(6);
    document.getElementById('pickupspotLon').value = lng.toFixed(6);
    
    // Show the add pickup spot modal with pre-filled coordinates
    const modal = new bootstrap.Modal(document.getElementById('addPickupSpotModal'));
    modal.show();
}

// PickupSpot modal functions
function showAddPickupSpotModal() {
    // Clear form
    document.getElementById('addPickupSpotForm').reset();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addPickupSpotModal'));
    modal.show();
}

async function addPickupSpot() {
    const spotData = {
        name: document.getElementById('pickupspotName').value,
        latitude: parseFloat(document.getElementById('pickupspotLat').value),
        longitude: parseFloat(document.getElementById('pickupspotLon').value),
        worker_count: parseInt(document.getElementById('pickupspotWorkers').value)
    };
    
    const errors = validatePickupSpot(spotData);
    if (errors.length > 0) {
        showError(errors.join(', '));
        return;
    }
    
    try {
        await api.addPickupSpot(spotData);
        await saveConfiguration();
        showSuccess(`Pickup Spot '${spotData.name}' added successfully`);
        
        // Close modal and reload
        bootstrap.Modal.getInstance(document.getElementById('addPickupSpotModal')).hide();
        loadPickupSpots();
    } catch (error) {
        showError('Failed to add pickup spot: ' + error.message);
    }
}

// Bulk pickup spot functions
function showBulkPickupSpotModal() {
    appState.spotFormCount = 0;
    const formsContainer = document.getElementById('bulk-pickup_spot-forms');
    formsContainer.innerHTML = '';
    
    // Add initial forms
    addPickupSpotForm();
    addPickupSpotForm();
    addPickupSpotForm();
    
    const modal = new bootstrap.Modal(document.getElementById('bulkPickupSpotModal'));
    modal.show();
}

function addPickupSpotForm() {
    const formsContainer = document.getElementById('bulk-pickup_spot-forms');
    const formIndex = appState.spotFormCount++;
    
    const formHtml = `
        <div class="bulk-form-item" id="pickupspot-form-${formIndex}">
            <button type="button" class="remove-btn" onclick="removePickupSpotForm(${formIndex})">×</button>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">PickupSpot Name</label>
                        <input type="text" class="form-control" name="name" placeholder="e.g., Shalimar">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Number of Workers</label>
                        <input type="number" class="form-control" name="worker_count" min="1" max="500" value="15">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Latitude</label>
                        <input type="number" class="form-control" name="latitude" step="0.000001" placeholder="31.520400">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Longitude</label>
                        <input type="number" class="form-control" name="longitude" step="0.000001" placeholder="74.358700">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    formsContainer.insertAdjacentHTML('beforeend', formHtml);
}

function removePickupSpotForm(formIndex) {
    const formElement = document.getElementById(`pickupspot-form-${formIndex}`);
    if (formElement) {
        formElement.remove();
    }
}

async function addBulkPickupSpots() {
    const formsContainer = document.getElementById('bulk-pickup_spot-forms');
    const forms = formsContainer.querySelectorAll('.bulk-form-item');
    const spotsData = [];
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input');
        const spotData = {};
        
        inputs.forEach(input => {
            if (input.name && input.value.trim() !== '') {
                if (input.type === 'number') {
                    spotData[input.name] = parseFloat(input.value);
                } else {
                    spotData[input.name] = input.value;
                }
            }
        });
        
        // Only add if all required fields are filled
        if (spotData.name && spotData.latitude && spotData.longitude && spotData.worker_count) {
            spotsData.push(spotData);
        }
    });
    
    if (spotsData.length === 0) {
        showError('Please fill in at least one complete pickup spot form');
        return;
    }
    
    // Validate all pickup spots
    const allErrors = [];
    spotsData.forEach((pickupspot, index) => {
        const errors = validatePickupSpot(pickupspot);
        if (errors.length > 0) {
            allErrors.push(`PickupSpot ${index + 1}: ${errors.join(', ')}`);
        }
    });
    
    if (allErrors.length > 0) {
        showError(allErrors.join('\n'));
        return;
    }
    
    try {
        await api.addBulkPickupSpots(spotsData);
        await saveConfiguration();
        showSuccess(`${spotsData.length} pcikup spots added successfully`);
        
        // Close modal and reload
        bootstrap.Modal.getInstance(document.getElementById('bulkPickupSpotModal')).hide();
        loadPickupSpots();
    } catch (error) {
        showError('Failed to add pickup spots: ' + error.message);
    }
}

async function deletePickupSpot(pickupspotId) {
    if (!confirm('Are you sure you want to delete this pickup spot?')) {
        return;
    }
    
    try {
        await api.deletePickupSpot(pickupspotId);
        await saveConfiguration();
        showSuccess('PickupSpot deleted successfully');
        loadPickupSpots();
    } catch (error) {
        showError('Failed to delete pickup spot: ' + error.message);
    }
}

// Optimization management
function loadOptimization() {
    // Check if configuration is complete
    if (!appState.config.is_complete) {
        document.getElementById('optimizeBtn').disabled = true;
        showError('Please complete configuration before optimization');
        return;
    } else {
        document.getElementById('optimizeBtn').disabled = false;
    }
}

async function optimizeRoutes() {
    if (!appState.config.is_complete) {
        showError('Please complete configuration before optimization');
        return;
    }
    
    // Always use advanced solver with optimal settings
    const requestData = {
        algorithm: 'advanced',
        use_real_roads: true,
        population_size: 100,
        generations: 200
    };
    
    showLoading(true, '✨ Optimizing routes with advanced AI solver...');
    document.getElementById('optimizeBtn').disabled = true;
    
    try {
        console.log('Optimization request:', requestData);
        const result = await api.optimizeRoutes(requestData);
        
        // Store result in appState
        appState.optimizationResult = result;
        
        showSuccess('🎉 Routes optimized successfully!');
        displayOptimizationResults(result);
        
        // Don't visualize on pickup spot map - only on Routes tab
        // visualizeRoutesOnMap(result); // REMOVED
        
        // Update Routes tab
        displayRoutesTab(result);
        
    } catch (error) {
        showError('Optimization failed: ' + error.message);
    } finally {
        showLoading(false);
        document.getElementById('optimizeBtn').disabled = false;
    }
}

// Algorithm options toggle function removed - no longer needed with simplified UI

function displayOptimizationResults(result) {
    const resultsElement = document.getElementById('optimization-results');
    if (!resultsElement) return;
    
    let html = `
        <div class="row">
            <div class="col-md-12">
                <div class="alert alert-success">
                    <h5><i class="fas fa-check-circle"></i> Optimization Complete!</h5>
                    <div class="row">
                        <div class="col-md-3">
                            <strong>Total Distance:</strong> ${formatNumber(result.total_distance)} km
                        </div>
                        <div class="col-md-3">
                            <strong>Total Cost:</strong> ${formatCurrency(result.total_cost)}
                        </div>
                        <div class="col-md-3">
                            <strong>Vehicles Used:</strong> ${result.total_vehicles_used}
                        </div>
                        <div class="col-md-3">
                            <strong>Unassigned:</strong> ${result.unassigned_pickupspots?.length || 0} pickupspots
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (result.unassigned_pickupspots && result.unassigned_pickupspots.length > 0) {
        html += `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle"></i> Unassigned Pickup Spots</h6>
                <p>The following pickup spots could not be assigned: ${result.unassigned_pickupspots.join(', ')}</p>
                <p>Consider adding more vehicles or increasing vehicle capacity.</p>
            </div>
        `;
    }
    
    // Route details
    html += '<div class="row">';
    
    result.routes.forEach((route, index) => {
        const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="route-card">
                    <div class="route-header">
                        <div>
                            <span class="route-color" style="background-color: ${color};"></span>
                            <strong>${route.vehicle_name}</strong> (${route.vehicle_type})
                        </div>
                        <small class="text-muted">${route.stops.length} stops</small>
                    </div>
                    <div class="row">
                        <div class="col-6">
                            <small><strong>Distance:</strong> ${formatNumber(route.total_distance_km)} km</small><br>
                            <small><strong>Cost:</strong> ${formatCurrency(route.total_cost)}</small>
                        </div>
                        <div class="col-6">
                            <small><strong>Workers:</strong> ${route.stops.reduce((sum, stop) => sum + stop.worker_count, 0)}</small><br>
                            <small><strong>Utilization:</strong> ${formatNumber(route.utilization_percent)}%</small>
                        </div>
                    </div>
                    <hr>
                    <small><strong>Route:</strong> Factory → ${route.stops.map(s => s.pickupspot_name).join(' → ')} → Factory</small>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Export buttons
    html += `
        <div class="row mt-3">
            <div class="col-12">
                <button class="btn btn-outline-primary me-2" onclick="exportCSV()">
                    <i class="fas fa-download"></i> Export CSV
                </button>
                <button class="btn btn-outline-secondary" onclick="optimizeRoutes()">
                    <i class="fas fa-redo"></i> Re-optimize
                </button>
            </div>
        </div>
    `;
    
    resultsElement.innerHTML = html;
    resultsElement.style.display = 'block';
}

async function exportCSV() {
    try {
        const csvData = await api.exportCSV();
        
        // Create and download file
        const blob = new Blob([csvData.content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = csvData.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('CSV file downloaded successfully');
    } catch (error) {
        showError('Failed to export CSV: ' + error.message);
    }
}

// Utility functions
function switchToTab(tabId) {
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        const tab = new bootstrap.Tab(tabElement);
        tab.show();
    }
}

// Route visualization on map
let routePolylines = []; // Store polylines for cleanup

function visualizeRoutesOnMap(result) {
    try {
        // Get the pickup spot map
        const map = appState.maps.pickupspot;
        
        if (!map) {
            console.error('PickupSpot map not initialized');
            return;
        }
        
        // Clear existing route lines
        routePolylines.forEach(polyline => {
            if (polyline && polyline.remove) {
                polyline.remove();
            }
        });
        routePolylines = [];
        
        // Colors for different vehicles (dark shades for better visibility)
        const colors = [
            '#C62828', // Dark Red
            '#AD1457', // Dark Pink
            '#6A1B9A', // Dark Purple
            '#4527A0', // Dark Deep Purple
            '#283593', // Dark Indigo
            '#1565C0', // Dark Blue
            '#0277BD', // Dark Light Blue
            '#00838F', // Dark Cyan
            '#00695C', // Dark Teal
            '#2E7D32', // Dark Green
            '#558B2F', // Dark Light Green
            '#9E9D24', // Dark Lime
            '#F9A825', // Dark Yellow
            '#FF8F00', // Dark Amber
            '#EF6C00', // Dark Orange
            '#D84315'  // Dark Deep Orange
        ];
        
        if (!result.routes || result.routes.length === 0) {
            console.log('No routes to visualize');
            return;
        }
        
        console.log('Visualizing routes:', result.routes);
    
    result.routes.forEach((route, index) => {
        const color = colors[index % colors.length];
        const routeCoords = [];
        
        // Use OSRM geometry from route_segments if available
        if (route.route_segments && route.route_segments.length > 0) {
            // Collect all waypoints from all segments
            route.route_segments.forEach(segment => {
                if (segment.waypoints && segment.waypoints.length > 0) {
                    segment.waypoints.forEach(wp => {
                        // waypoints are [lon, lat] from OSRM, convert to [lat, lon] for Leaflet
                        if (Array.isArray(wp) && wp.length === 2) {
                            routeCoords.push([wp[1], wp[0]]);
                        }
                    });
                }
            });
        }
        
        // Fallback: use pickup spot coordinates if no OSRM geometry available
        if (routeCoords.length === 0) {
            // Add factory as start point
            if (appState.config.factory) {
                routeCoords.push([appState.config.factory.latitude, appState.config.factory.longitude]);
            }
            
            // Add all pickup spots stops
            route.stops.forEach(stop => {
                const pickupspot = appState.config.pickup_spots.find(d => d.name === stop.pickupspot_name);
                if (pickupspot) {
                    routeCoords.push([pickupspot.latitude, pickupspot.longitude]);
                }
            });
            
            // Return to factory
            if (appState.config.factory) {
                routeCoords.push([appState.config.factory.latitude, appState.config.factory.longitude]);
            }
        }
        
        // Draw polyline for this route
        if (routeCoords.length > 1) {
            const polyline = L.polyline(routeCoords, {
                color: color,
                weight: 7,
                opacity: 0.8,
                smoothFactor: 1
            }).addTo(map);
            
            // Add arrows to show direction (if decorator available)
            if (L.polylineDecorator) {
                try {
                    const decorator = L.polylineDecorator(polyline, {
                        patterns: [
                            {
                                offset: '50%',
                                repeat: 100,
                                symbol: L.Symbol.arrowHead({
                                    pixelSize: 15,
                                    polygon: false,
                                    pathOptions: {
                                        stroke: true,
                                        weight: 4,
                                        color: color,
                                        opacity: 0.9
                                    }
                                })
                            }
                        ]
                    }).addTo(map);
                    routePolylines.push(decorator);
                } catch (e) {
                    console.log('Decorator not available:', e);
                }
            }
            
            // Add popup with route info
            const vehicle = result.routes[index];
            const distance = route.distance ? route.distance.toFixed(1) : '0.0';
            const workers = route.total_workers || 0;
            const stops = route.stops ? route.stops.length : 0;
            const cost = vehicle.cost ? vehicle.cost.toFixed(0) : '0';
            
            const popupContent = `
                <div style="min-width: 200px;">
                    <h6 style="color: ${color}; margin-bottom: 8px;">
                        <i class="fas fa-truck"></i> ${vehicle.vehicle_name || 'Unknown'}
                    </h6>
                    <div style="font-size: 13px;">
                        <b>Distance:</b> ${distance} km<br>
                        <b>Workers:</b> ${workers}<br>
                        <b>Stops:</b> ${stops}<br>
                        <b>Cost:</b> ${cost} PKR
                    </div>
                </div>
            `;
            polyline.bindPopup(popupContent);
            
            routePolylines.push(polyline);
        }
    });
    
        // Fit map to show all routes
        if (routePolylines.length > 0) {
            const group = L.featureGroup(routePolylines.filter(p => p.getBounds));
            if (group.getLayers().length > 0) {
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }
        
        showSuccess(`✅ Visualized ${result.routes.length} routes on map`);
    } catch (error) {
        console.error('Error visualizing routes:', error);
        showError('Failed to visualize routes on map: ' + error.message);
    }
}

// ============================================================================
// Routes Tab Functions
// ============================================================================

let routesMap = null;
let routesMapInitialized = false;

function initializeRoutesMap() {
    if (routesMapInitialized) return;
    
    const mapElement = document.getElementById('routesMap');
    if (!mapElement) return;
    
    // Initialize map centered on factory or default location
    const centerLat = appState.config.factory ? appState.config.factory.latitude : 31.5204;
    const centerLon = appState.config.factory ? appState.config.factory.longitude : 74.3587;
    
    routesMap = L.map('routesMap').setView([centerLat, centerLon], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(routesMap);
    
    // Add factory marker if available
    if (appState.config.factory) {
        const factoryIcon = L.divIcon({
            html: '<i class="fas fa-industry" style="color: #dc3545; font-size: 24px;"></i>',
            className: 'factory-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
        
        L.marker([appState.config.factory.latitude, appState.config.factory.longitude], {
            icon: factoryIcon
        }).addTo(routesMap).bindPopup(`<b>${appState.config.factory.name}</b><br>Factory Location`);
    }
    
    routesMapInitialized = true;
    
    // Force map to resize
    setTimeout(() => {
        routesMap.invalidateSize();
    }, 100);
}

function displayRoutesTab(result) {
    if (!result || !result.routes || result.routes.length === 0) {
        document.getElementById('routes-empty-state').style.display = 'block';
        document.getElementById('routes-map-container').style.display = 'none';
        document.getElementById('fitRoutesBtn').style.display = 'none';
        return;
    }
    
    // Show routes container
    document.getElementById('routes-empty-state').style.display = 'none';
    document.getElementById('routes-map-container').style.display = 'block';
    document.getElementById('fitRoutesBtn').style.display = 'inline-block';
    
    // Initialize map if needed
    if (!routesMapInitialized) {
        initializeRoutesMap();
    }
    
    // Display routes on map
    if (routesMap) {
        displayRoutesOnMap(result, routesMap);
    }
    
    // Update legend
    updateRoutesLegend(result.routes);
    
    // Update details table
    updateRoutesTable(result.routes);
}

function displayRoutesOnMap(result, map) {
    if (window.routeVisualizer) {
        window.routeVisualizer.clearRoutes(map);
        window.routeVisualizer.displayRoutes(result.routes, map);
        
        // Fit map to show all routes
        setTimeout(() => {
            fitRoutesView();
        }, 200);
    }
}

function updateRoutesLegend(routes) {
    const legendContainer = document.getElementById('routes-legend');
    if (!legendContainer) return;
    
    let html = '';
    routes.forEach((route, index) => {
        const color = route.route_color || '#3388ff';
        const totalWorkers = route.stops.reduce((sum, stop) => sum + stop.worker_count, 0);
        
        html += `
            <div class="col-md-4 col-sm-6 mb-2">
                <div class="d-flex align-items-center">
                    <div style="width: 30px; height: 4px; background-color: ${color}; margin-right: 10px;"></div>
                    <div>
                        <strong>${route.vehicle_name}</strong><br>
                        <small>${route.stops.length} stops • ${totalWorkers} workers</small>
                    </div>
                </div>
            </div>
        `;
    });
    
    legendContainer.innerHTML = html;
}

function updateRoutesTable(routes) {
    const tbody = document.getElementById('routes-details-body');
    if (!tbody) return;
    
    let html = '';
    routes.forEach((route, index) => {
        const totalWorkers = route.stops.reduce((sum, stop) => sum + stop.worker_count, 0);
        const duration = route.total_duration_minutes || (route.total_distance_km / 40 * 60); // Fallback to estimated duration
        const utilizationClass = route.utilization_percent > 90 ? 'success' : 
                                route.utilization_percent > 70 ? 'warning' : 'danger';
        
        html += `
            <tr>
                <td>
                    <span style="color: ${route.route_color};">●</span>
                    <strong>${route.vehicle_name}</strong>
                    <br>
                    <small class="text-muted">${route.vehicle_type}</small>
                </td>
                <td>${route.total_distance_km.toFixed(2)} km</td>
                <td>${duration.toFixed(0)} min</td>
                <td>PKR ${route.total_cost.toFixed(0)}</td>
                <td>${route.stops.length}</td>
                <td>${totalWorkers}</td>
                <td>
                    <span class="badge bg-${utilizationClass}">
                        ${route.utilization_percent.toFixed(1)}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showTurnByTurnDirections(${index})">
                        <i class="fas fa-directions"></i> View Directions
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function showTurnByTurnDirections(routeIndex) {
    if (!appState.optimizationResult || !appState.optimizationResult.routes) {
        return;
    }
    
    const route = appState.optimizationResult.routes[routeIndex];
    if (!route) return;
    
    // Update vehicle name
    const vehicleNameSpan = document.getElementById('selected-vehicle-name');
    if (vehicleNameSpan) {
        vehicleNameSpan.textContent = route.vehicle_name;
    }
    
    // Get turn-by-turn steps from route segments
    let allSteps = [];
    if (route.route_segments && route.route_segments.length > 0) {
        route.route_segments.forEach(segment => {
            if (segment.steps && Array.isArray(segment.steps)) {
                allSteps = allSteps.concat(segment.steps);
            }
        });
    }
    
    // Display turn-by-turn directions
    const directionsDiv = document.getElementById('turn-by-turn-directions');
    const container = document.getElementById('turn-by-turn-container');
    
    if (!directionsDiv || !container) return;
    
    if (allSteps.length === 0) {
        directionsDiv.innerHTML = '<div class="alert alert-info">No turn-by-turn directions available for this route.</div>';
    } else {
        let html = '<div class="list-group">';
        
        allSteps.forEach((step, index) => {
            const icon = getManeuverIcon(step.type, step.modifier);
            const streetInfo = step.street_name ? `on <strong>${step.street_name}</strong>` : '';
            
            html += `
                <div class="list-group-item">
                    <div class="d-flex w-100 align-items-start">
                        <div class="me-3 fs-4" style="min-width: 40px; text-align: center;">
                            ${icon}
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${step.instruction}</h6>
                            ${streetInfo ? `<p class="mb-1 text-muted">${streetInfo}</p>` : ''}
                            <small class="text-muted">
                                ${step.distance_km ? `${(step.distance_km * 1000).toFixed(0)} m` : ''} 
                                ${step.duration_min ? `• ${step.duration_min.toFixed(1)} min` : ''}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        directionsDiv.innerHTML = html;
    }
    
    // Show container and scroll to it
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getManeuverIcon(type, modifier) {
    // Map OSRM maneuver types to icons
    const iconMap = {
        'turn': {
            'left': '↰',
            'right': '↱',
            'slight left': '⬉',
            'slight right': '⬈',
            'sharp left': '⬅',
            'sharp right': '➡',
            'uturn': '⮌'
        },
        'depart': '🚗',
        'arrive': '🏁',
        'merge': '⮕',
        'fork': '⑂',
        'roundabout': '⭮',
        'continue': '⬆',
        'straight': '⬆'
    };
    
    if (type === 'turn' && modifier && iconMap.turn[modifier]) {
        return iconMap.turn[modifier];
    }
    
    return iconMap[type] || '➤';
}

function fitRoutesView() {
    if (!routesMap || !window.routeVisualizer || !window.routeVisualizer.routeLayers || window.routeVisualizer.routeLayers.length === 0) {
        return;
    }
    
    // Get all polyline layers
    const polylines = window.routeVisualizer.routeLayers.filter(layer => layer instanceof L.Polyline);
    
    if (polylines.length > 0) {
        const group = L.featureGroup(polylines);
        routesMap.fitBounds(group.getBounds().pad(0.1));
    }
}

// Tab change listener to initialize map when Routes tab is shown
document.addEventListener('shown.bs.tab', function (event) {
    if (event.target.id === 'routes-tab') {
        if (!routesMapInitialized) {
            initializeRoutesMap();
        } else if (routesMap) {
            // Refresh map size
            setTimeout(() => {
                routesMap.invalidateSize();
                if (appState.optimizationResult) {
                    displayRoutesTab(appState.optimizationResult);
                }
            }, 100);
        }
    }
});
