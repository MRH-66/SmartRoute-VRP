/**
 * SmartRoute API Client
 * Handles all API communication with the backend
 */

class SmartRouteAPI {
    constructor(baseUrl = '') {
        // Use config if available, otherwise use provided baseUrl
        this.baseUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || baseUrl;
        this.sessionId = 'default';
    }

    // Helper method for making API requests
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}/api${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Configuration endpoints
    async getConfiguration() {
        return await this.request(`/config/${this.sessionId}`);
    }

    async clearConfiguration() {
        return await this.request(`/config/${this.sessionId}`, 'DELETE');
    }

    // Factory endpoints
    async setFactory(factoryData) {
        return await this.request(`/factory/${this.sessionId}`, 'POST', factoryData);
    }

    async getFactory() {
        return await this.request(`/factory/${this.sessionId}`);
    }

    async deleteFactory() {
        return await this.request(`/factory/${this.sessionId}`, 'DELETE');
    }

    // Vehicle endpoints
    async addVehicle(vehicleData) {
        return await this.request(`/vehicles/${this.sessionId}`, 'POST', vehicleData);
    }

    async addBulkVehicles(vehiclesData) {
        return await this.request(`/vehicles/${this.sessionId}/bulk`, 'POST', { vehicles: vehiclesData });
    }

    async getVehicles() {
        return await this.request(`/vehicles/${this.sessionId}`);
    }

    async updateVehicle(vehicleId, vehicleData) {
        return await this.request(`/vehicles/${this.sessionId}/${vehicleId}`, 'PUT', vehicleData);
    }

    async deleteVehicle(vehicleId) {
        return await this.request(`/vehicles/${this.sessionId}/${vehicleId}`, 'DELETE');
    }

    // Depot endpoints
    async addDepot(spotData) {
        return await this.request(`/pickup_spots/${this.sessionId}`, 'POST', spotData);
    }

    async addBulkDepots(spotsData) {
        return await this.request(`/pickup_spots/${this.sessionId}/bulk`, 'POST', { pickup_spots: spotsData });
    }

    async getDepots() {
        return await this.request(`/pickup_spots/${this.sessionId}`);
    }

    async updateDepot(depotId, spotData) {
        return await this.request(`/pickup_spots/${this.sessionId}/${depotId}`, 'PUT', spotData);
    }

    async deleteDepot(depotId) {
        return await this.request(`/pickup_spots/${this.sessionId}/${depotId}`, 'DELETE');
    }

    // Optimization endpoints
    async optimizeRoutes(optimizationData) {
        return await this.request(`/optimize/${this.sessionId}`, 'POST', optimizationData);
    }

    async getOptimizationResults() {
        return await this.request(`/results/${this.sessionId}`);
    }

    // Export endpoints
    async exportCSV() {
        return await this.request(`/export/${this.sessionId}/csv`);
    }

    // Health check
    async healthCheck() {
        return await this.request('/health');
    }
}

// Create global API instance
const api = new SmartRouteAPI();

// Helper functions for common operations
async function showError(message, title = 'Error') {
    console.error(title + ':', message);
    
    // Create error alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        <strong>${title}:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

async function showSuccess(message, title = 'Success') {
    console.log(title + ':', message);
    
    // Create success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <strong>${title}:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }
}

async function showLoading(show = true) {
    const loadingElement = document.getElementById('optimization-loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

// Validation helpers
function validateVehicle(vehicleData) {
    const errors = [];
    
    if (!vehicleData.name || vehicleData.name.trim().length === 0) {
        errors.push('Vehicle name is required');
    }
    
    if (!vehicleData.vehicle_type || !['Self-owned', 'Rented'].includes(vehicleData.vehicle_type)) {
        errors.push('Valid vehicle type is required');
    }
    
    if (!vehicleData.capacity || vehicleData.capacity < 1 || vehicleData.capacity > 200) {
        errors.push('Capacity must be between 1 and 200');
    }
    
    if (!vehicleData.cost_per_km || vehicleData.cost_per_km < 0.1 || vehicleData.cost_per_km > 1000) {
        errors.push('Cost per km must be between 0.1 and 1000');
    }
    
    return errors;
}

function validateDepot(spotData) {
    const errors = [];
    
    if (!spotData.name || spotData.name.trim().length === 0) {
        errors.push('Depot name is required');
    }
    
    if (!spotData.latitude || spotData.latitude < -90 || spotData.latitude > 90) {
        errors.push('Valid latitude is required (-90 to 90)');
    }
    
    if (!spotData.longitude || spotData.longitude < -180 || spotData.longitude > 180) {
        errors.push('Valid longitude is required (-180 to 180)');
    }
    
    if (!spotData.worker_count || spotData.worker_count < 1 || spotData.worker_count > 500) {
        errors.push('Worker count must be between 1 and 500');
    }
    
    return errors;
}

function validateFactory(factoryData) {
    const errors = [];
    
    if (!factoryData.name || factoryData.name.trim().length === 0) {
        errors.push('Factory name is required');
    }
    
    if (!factoryData.latitude || factoryData.latitude < -90 || factoryData.latitude > 90) {
        errors.push('Valid latitude is required (-90 to 90)');
    }
    
    if (!factoryData.longitude || factoryData.longitude < -180 || factoryData.longitude > 180) {
        errors.push('Valid longitude is required (-180 to 180)');
    }
    
    return errors;
}

// Utility functions
function formatNumber(num, decimals = 1) {
    return Number(num).toFixed(decimals);
}

function formatCurrency(amount, currency = 'PKR') {
    return `${formatNumber(amount, 0)} ${currency}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}