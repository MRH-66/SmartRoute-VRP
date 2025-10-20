/**
 * SmartRoute Frontend Application
 * Main application logic and UI management
 */

// Global state
let appState = {
    config: null,
    maps: {},
    vehicleFormCount: 0,
    depotFormCount: 0
};

// Route colors for visualization
const ROUTE_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#0984E3', '#A29BFE', '#FD79A8'
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
            depots: [],
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
    const steps = ['factory', 'vehicles', 'depots', 'optimize'];
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
    updateDepotStatus();
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

function updateDepotStatus() {
    const statusElement = document.getElementById('depot-status');
    if (!statusElement) return;
    
    if (appState.config.depots.length > 0) {
        const totalWorkers = appState.config.depots.reduce((sum, d) => sum + d.worker_count, 0);
        
        statusElement.className = 'status-set';
        statusElement.innerHTML = `
            <i class="fas fa-check-circle"></i> 
            ${appState.config.depots.length} depots
            <br><small>${totalWorkers} total workers</small>
        `;
    } else {
        statusElement.className = 'status-not-set';
        statusElement.innerHTML = '<i class="fas fa-times-circle"></i> No depots';
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
    } else if (appState.config.depots.length === 0) {
        html = `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle"></i> Next Step</h6>
                <p>Map pickup locations</p>
                <button class="btn btn-primary" onclick="switchToTab('depots-tab')">
                    <i class="fas fa-map-marker-alt"></i> Add Depots
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
    
    // Depot map
    if (!appState.maps.depot) {
        const depotMapElement = document.getElementById('depot-map');
        if (depotMapElement) {
            appState.maps.depot = L.map('depot-map').setView([31.5204, 74.3587], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(appState.maps.depot);
            
            // Click handler for depot location
            appState.maps.depot.on('click', function(e) {
                if (appState.config.factory) {
                    setDepotLocation(e.latlng.lat, e.latlng.lng);
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
    
    if (appState.maps.depot) {
        appState.maps.depot.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                appState.maps.depot.removeLayer(layer);
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
        
        if (appState.maps.depot) {
            L.marker([appState.config.factory.latitude, appState.config.factory.longitude], {icon: factoryIcon})
                .addTo(appState.maps.depot)
                .bindPopup(`🏭 ${appState.config.factory.name}`);
        }
    }
    
    // Add depot markers
    appState.config.depots.forEach(depot => {
        const depotIcon = L.divIcon({
            html: '<i class="fas fa-users" style="color: blue; font-size: 16px;"></i>',
            iconSize: [25, 25],
            className: 'custom-div-icon'
        });
        
        if (appState.maps.depot) {
            L.marker([depot.latitude, depot.longitude], {icon: depotIcon})
                .addTo(appState.maps.depot)
                .bindPopup(`📍 ${depot.name}<br>👥 ${depot.worker_count} workers`);
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
                if (appState.maps.depot) appState.maps.depot.invalidateSize();
            }, 100);
            
            // Update content based on active tab
            const tabId = this.getAttribute('href').substring(1);
            switch(tabId) {
                case 'vehicles':
                    loadVehicles();
                    break;
                case 'depots':
                    loadDepots();
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

// Depot management - Enhanced for multiple additions
async function loadDepots() {
    try {
        const depots = await api.getDepots();
        updateDepotSummary(depots);
        updateDepotList(depots);
        updateMapMarkers();
    } catch (error) {
        showError('Failed to load depots: ' + error.message);
    }
}

function updateDepotSummary(depots) {
    const summaryElement = document.getElementById('depot-summary');
    if (!summaryElement) return;
    
    const totalWorkers = depots.reduce((sum, d) => sum + d.worker_count, 0);
    const avgWorkers = depots.length > 0 ? totalWorkers / depots.length : 0;
    
    summaryElement.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h6><i class="fas fa-map-marker-alt"></i> Depot Summary</h6>
                <div class="row text-center">
                    <div class="col-6">
                        <h4>${depots.length}</h4>
                        <small>Total Depots</small>
                    </div>
                    <div class="col-6">
                        <h4>${totalWorkers}</h4>
                        <small>Total Workers</small>
                    </div>
                </div>
                <hr>
                <small class="text-muted">Average: ${formatNumber(avgWorkers, 1)} workers per depot</small>
            </div>
        </div>
    `;
}

function updateDepotList(depots) {
    const listElement = document.getElementById('depot-list');
    if (!listElement) return;
    
    if (depots.length === 0) {
        listElement.innerHTML = `
            <div class="alert alert-info">
                <h6><i class="fas fa-info-circle"></i> No depots configured</h6>
                <p>Click on the map or use the "Add Depot" button to add pickup locations.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="list-group">';
    
    depots.forEach((depot, index) => {
        html += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${depot.name}</h6>
                        <p class="mb-1"><i class="fas fa-users"></i> ${depot.worker_count} workers</p>
                        <small class="text-muted"><i class="fas fa-map-marker-alt"></i> ${depot.latitude.toFixed(4)}, ${depot.longitude.toFixed(4)}</small>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="editDepot('${depot.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </a></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deleteDepot('${depot.id}')">
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

function setDepotLocation(lat, lng) {
    document.getElementById('depotLat').value = lat.toFixed(6);
    document.getElementById('depotLon').value = lng.toFixed(6);
    
    // Show the add depot modal with pre-filled coordinates
    const modal = new bootstrap.Modal(document.getElementById('addDepotModal'));
    modal.show();
}

// Depot modal functions
function showAddDepotModal() {
    // Clear form
    document.getElementById('addDepotForm').reset();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addDepotModal'));
    modal.show();
}

async function addDepot() {
    const depotData = {
        name: document.getElementById('depotName').value,
        latitude: parseFloat(document.getElementById('depotLat').value),
        longitude: parseFloat(document.getElementById('depotLon').value),
        worker_count: parseInt(document.getElementById('depotWorkers').value)
    };
    
    const errors = validateDepot(depotData);
    if (errors.length > 0) {
        showError(errors.join(', '));
        return;
    }
    
    try {
        await api.addDepot(depotData);
        await saveConfiguration();
        showSuccess(`Depot '${depotData.name}' added successfully`);
        
        // Close modal and reload
        bootstrap.Modal.getInstance(document.getElementById('addDepotModal')).hide();
        loadDepots();
    } catch (error) {
        showError('Failed to add depot: ' + error.message);
    }
}

// Bulk depot functions
function showBulkDepotModal() {
    appState.depotFormCount = 0;
    const formsContainer = document.getElementById('bulk-depot-forms');
    formsContainer.innerHTML = '';
    
    // Add initial forms
    addDepotForm();
    addDepotForm();
    addDepotForm();
    
    const modal = new bootstrap.Modal(document.getElementById('bulkDepotModal'));
    modal.show();
}

function addDepotForm() {
    const formsContainer = document.getElementById('bulk-depot-forms');
    const formIndex = appState.depotFormCount++;
    
    const formHtml = `
        <div class="bulk-form-item" id="depot-form-${formIndex}">
            <button type="button" class="remove-btn" onclick="removeDepotForm(${formIndex})">×</button>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Depot Name</label>
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

function removeDepotForm(formIndex) {
    const formElement = document.getElementById(`depot-form-${formIndex}`);
    if (formElement) {
        formElement.remove();
    }
}

async function addBulkDepots() {
    const formsContainer = document.getElementById('bulk-depot-forms');
    const forms = formsContainer.querySelectorAll('.bulk-form-item');
    const depotsData = [];
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input');
        const depotData = {};
        
        inputs.forEach(input => {
            if (input.name && input.value.trim() !== '') {
                if (input.type === 'number') {
                    depotData[input.name] = parseFloat(input.value);
                } else {
                    depotData[input.name] = input.value;
                }
            }
        });
        
        // Only add if all required fields are filled
        if (depotData.name && depotData.latitude && depotData.longitude && depotData.worker_count) {
            depotsData.push(depotData);
        }
    });
    
    if (depotsData.length === 0) {
        showError('Please fill in at least one complete depot form');
        return;
    }
    
    // Validate all depots
    const allErrors = [];
    depotsData.forEach((depot, index) => {
        const errors = validateDepot(depot);
        if (errors.length > 0) {
            allErrors.push(`Depot ${index + 1}: ${errors.join(', ')}`);
        }
    });
    
    if (allErrors.length > 0) {
        showError(allErrors.join('\n'));
        return;
    }
    
    try {
        await api.addBulkDepots(depotsData);
        await saveConfiguration();
        showSuccess(`${depotsData.length} depots added successfully`);
        
        // Close modal and reload
        bootstrap.Modal.getInstance(document.getElementById('bulkDepotModal')).hide();
        loadDepots();
    } catch (error) {
        showError('Failed to add depots: ' + error.message);
    }
}

async function deleteDepot(depotId) {
    if (!confirm('Are you sure you want to delete this depot?')) {
        return;
    }
    
    try {
        await api.deleteDepot(depotId);
        await saveConfiguration();
        showSuccess('Depot deleted successfully');
        loadDepots();
    } catch (error) {
        showError('Failed to delete depot: ' + error.message);
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
        
        showSuccess('🎉 Routes optimized successfully!');
        displayOptimizationResults(result);
        
        // Visualize routes on map
        if (result.routes && result.routes.length > 0) {
            visualizeRoutesOnMap(result);
        }
        
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
                            <strong>Unassigned:</strong> ${result.unassigned_depots.length} depots
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (result.unassigned_depots.length > 0) {
        html += `
            <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle"></i> Unassigned Depots</h6>
                <p>The following depots could not be assigned: ${result.unassigned_depots.join(', ')}</p>
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
                    <small><strong>Route:</strong> Factory → ${route.stops.map(s => s.depot_name).join(' → ')} → Factory</small>
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
        // Get the depot map
        const map = appState.maps.depot;
        
        if (!map) {
            console.error('Depot map not initialized');
            return;
        }
        
        // Clear existing route lines
        routePolylines.forEach(polyline => {
            if (polyline && polyline.remove) {
                polyline.remove();
            }
        });
        routePolylines = [];
        
        // Colors for different vehicles (vibrant colors for better visibility)
        const colors = [
            '#FF0000', // Red
            '#0000FF', // Blue
            '#00FF00', // Green
            '#FFA500', // Orange
            '#9400D3', // Purple
            '#FF1493', // Deep Pink
            '#00CED1', // Dark Turquoise
            '#FFD700', // Gold
            '#FF4500', // Orange Red
            '#32CD32'  // Lime Green
        ];
        
        if (!result.routes || result.routes.length === 0) {
            console.log('No routes to visualize');
            return;
        }
        
        console.log('Visualizing routes:', result.routes);
    
    result.routes.forEach((route, index) => {
        const color = colors[index % colors.length];
        const routeCoords = [];
        
        // Add factory as start point
        if (appState.config.factory) {
            routeCoords.push([appState.config.factory.latitude, appState.config.factory.longitude]);
        }
        
        // Add all depot stops
        route.stops.forEach(stop => {
            const depot = appState.config.depots.find(d => d.name === stop.depot_name);
            if (depot) {
                routeCoords.push([depot.latitude, depot.longitude]);
            }
        });
        
        // Return to factory
        if (appState.config.factory) {
            routeCoords.push([appState.config.factory.latitude, appState.config.factory.longitude]);
        }
        
        // Draw polyline for this route
        if (routeCoords.length > 1) {
            const polyline = L.polyline(routeCoords, {
                color: color,
                weight: 5,
                opacity: 0.8,
                smoothFactor: 1,
                dashArray: '10, 10'
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
                                        weight: 3,
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