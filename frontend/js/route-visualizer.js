/**
 * Enhanced Route Visualization for SmartRoute
 * Handles real route display on maps with different colors per vehicle
 */

class RouteVisualizer {
    constructor(mapId) {
        this.mapId = mapId;
        this.routeLayers = [];
        this.vehicleColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
            '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
        ];
    }

    displayRoutes(routes, map) {
        console.log('Displaying routes:', routes);
        
        // Clear existing route layers
        this.clearRoutes(map);
        
        if (!routes || routes.length === 0) {
            return;
        }

        routes.forEach((route, index) => {
            const color = route.route_color || this.vehicleColors[index % this.vehicleColors.length];
            this.displayVehicleRoute(route, color, map);
        });
    }

    displayVehicleRoute(route, color, map) {
        if (!route.stops || route.stops.length === 0) {
            return;
        }

        // Create route coordinates array
        const coordinates = [];
        
        // Add factory as starting point
        if (appState.config.factory) {
            coordinates.push([appState.config.factory.latitude, appState.config.factory.longitude]);
        }

        // Add all stops in order
        route.stops
            .sort((a, b) => a.arrival_order - b.arrival_order)
            .forEach(stop => {
                coordinates.push([stop.latitude, stop.longitude]);
            });

        // Return to factory
        if (appState.config.factory) {
            coordinates.push([appState.config.factory.latitude, appState.config.factory.longitude]);
        }

        // Create polyline for route
        const polyline = L.polyline(coordinates, {
            color: color,
            weight: 4,
            opacity: 0.8,
            dashArray: route.vehicle_type === 'Rented' ? '10, 5' : null
        });

        // Add popup with route information
        const popupContent = this.createRoutePopup(route);
        polyline.bindPopup(popupContent);

        // Add to map and track
        polyline.addTo(map);
        this.routeLayers.push(polyline);

        // Add direction arrows
        this.addDirectionArrows(coordinates, color, map);

        // Add stop markers with detailed info
        this.addStopMarkers(route, color, map);
    }

    createRoutePopup(route) {
        const totalWorkers = route.stops.reduce((sum, stop) => sum + stop.worker_count, 0);
        const utilizationClass = route.utilization_percent > 90 ? 'text-success' : 
                                route.utilization_percent > 70 ? 'text-warning' : 'text-danger';

        return `
            <div class="route-popup">
                <h6><i class="fas fa-bus"></i> ${route.vehicle_name}</h6>
                <div class="route-details">
                    <div><strong>Type:</strong> ${route.vehicle_type}</div>
                    <div><strong>Distance:</strong> ${route.total_distance_km.toFixed(1)} km</div>
                    <div><strong>Cost:</strong> ₹${route.total_cost.toFixed(0)}</div>
                    <div><strong>Workers:</strong> ${totalWorkers}</div>
                    <div class="${utilizationClass}"><strong>Utilization:</strong> ${route.utilization_percent.toFixed(1)}%</div>
                    <div><strong>Stops:</strong> ${route.stops.length}</div>
                </div>
                <div class="stop-sequence">
                    <strong>Route:</strong> Factory → ${route.stops.map(s => s.depot_name).join(' → ')} → Factory
                </div>
            </div>
        `;
    }

    addDirectionArrows(coordinates, color, map) {
        for (let i = 0; i < coordinates.length - 1; i++) {
            const start = coordinates[i];
            const end = coordinates[i + 1];
            
            // Calculate midpoint
            const midLat = (start[0] + end[0]) / 2;
            const midLng = (start[1] + end[1]) / 2;
            
            // Calculate bearing for arrow direction
            const bearing = this.calculateBearing(start[0], start[1], end[0], end[1]);
            
            // Create arrow marker
            const arrowIcon = L.divIcon({
                html: `<div style="transform: rotate(${bearing}deg); color: ${color}; font-size: 16px;">→</div>`,
                className: 'route-arrow',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            const arrowMarker = L.marker([midLat, midLng], {icon: arrowIcon});
            arrowMarker.addTo(map);
            this.routeLayers.push(arrowMarker);
        }
    }

    addStopMarkers(route, color, map) {
        route.stops.forEach((stop, index) => {
            // Create custom icon for stop
            const stopIcon = L.divIcon({
                html: `
                    <div class="stop-marker" style="background-color: ${color}; border-color: ${color};">
                        <span class="stop-number">${stop.arrival_order}</span>
                    </div>
                `,
                className: 'custom-stop-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            const marker = L.marker([stop.latitude, stop.longitude], {icon: stopIcon});
            
            // Detailed popup for stop
            const stopPopup = `
                <div class="stop-popup">
                    <h6><i class="fas fa-map-marker-alt"></i> ${stop.depot_name}</h6>
                    <div class="stop-details">
                        <div><strong>Stop #:</strong> ${stop.arrival_order}</div>
                        <div><strong>Workers Picked:</strong> ${stop.worker_count}</div>
                        <div><strong>Cumulative Load:</strong> ${stop.cumulative_load || stop.worker_count}</div>
                        <div><strong>Vehicle:</strong> ${route.vehicle_name}</div>
                        ${stop.pickup_details ? `<div><em>${stop.pickup_details}</em></div>` : ''}
                    </div>
                </div>
            `;
            
            marker.bindPopup(stopPopup);
            marker.addTo(map);
            this.routeLayers.push(marker);
        });
    }

    calculateBearing(lat1, lng1, lat2, lng2) {
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        
        const y = Math.sin(dLng) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
        
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    clearRoutes(map) {
        this.routeLayers.forEach(layer => {
            map.removeLayer(layer);
        });
        this.routeLayers = [];
    }

    // Enhanced results display with visual routes
    displayOptimizationResults(result) {
        const resultsContainer = document.getElementById('optimizationResults');
        if (!result || !result.routes) {
            resultsContainer.innerHTML = '<div class="alert alert-warning">No optimization results to display</div>';
            return;
        }

        // Calculate efficiency metrics
        const totalWorkers = result.routes.reduce((sum, route) => 
            sum + route.stops.reduce((stopSum, stop) => stopSum + stop.worker_count, 0), 0);
        
        const avgUtilization = result.routes.reduce((sum, route) => 
            sum + route.utilization_percent, 0) / result.routes.length;

        let html = `
            <div class="alert alert-success mb-4">
                <h5><i class="fas fa-check-circle"></i> 🚀 Advanced Optimization Complete!</h5>
                <div class="row text-center">
                    <div class="col-md-2">
                        <div class="metric-card">
                            <div class="metric-value">${result.total_distance.toFixed(1)} km</div>
                            <div class="metric-label">Total Distance</div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="metric-card">
                            <div class="metric-value">₹${result.total_cost.toFixed(0)}</div>
                            <div class="metric-label">Total Cost</div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="metric-card">
                            <div class="metric-value">${result.total_vehicles_used}</div>
                            <div class="metric-label">Vehicles Used</div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="metric-card">
                            <div class="metric-value">${totalWorkers}</div>
                            <div class="metric-label">Workers Served</div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="metric-card">
                            <div class="metric-value">${avgUtilization.toFixed(1)}%</div>
                            <div class="metric-label">Avg Utilization</div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="metric-card">
                            <div class="metric-value">₹${(result.total_cost / totalWorkers).toFixed(0)}</div>
                            <div class="metric-label">Cost/Worker</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Show unassigned depots if any
        if (result.unassigned_depots && result.unassigned_depots.length > 0) {
            html += `
                <div class="alert alert-warning">
                    <h6><i class="fas fa-exclamation-triangle"></i> Unassigned Depots</h6>
                    <p>The following depots could not be assigned:</p>
                    <ul>
                        ${result.unassigned_depots.map(depot => `<li>${depot}</li>`).join('')}
                    </ul>
                    <small>Consider adding more vehicles or increasing vehicle capacity.</small>
                </div>
            `;
        }

        // Display routes with enhanced information
        if (result.routes && result.routes.length > 0) {
            html += '<div class="routes-section"><h5><i class="fas fa-route"></i> Optimized Routes</h5>';
            
            result.routes.forEach((route, index) => {
                const color = route.route_color || this.vehicleColors[index % this.vehicleColors.length];
                const totalWorkers = route.stops.reduce((sum, stop) => sum + stop.worker_count, 0);
                const utilizationClass = route.utilization_percent > 90 ? 'success' : 
                                       route.utilization_percent > 70 ? 'warning' : 'danger';
                
                html += `
                    <div class="route-card mb-3" style="border-left: 4px solid ${color};">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-8">
                                    <h6 class="card-title">
                                        <span class="vehicle-icon" style="color: ${color};">🚌</span>
                                        ${route.vehicle_name} 
                                        <span class="badge badge-${route.vehicle_type === 'Self-owned' ? 'success' : 'warning'}">${route.vehicle_type}</span>
                                    </h6>
                                    <div class="route-summary">
                                        <span class="badge badge-primary">${route.stops.length} stops</span>
                                        <span class="badge badge-info">${route.total_distance_km.toFixed(1)} km</span>
                                        <span class="badge badge-secondary">₹${route.total_cost.toFixed(0)}</span>
                                        <span class="badge badge-dark">${totalWorkers} workers</span>
                                        <span class="badge badge-${utilizationClass}">${route.utilization_percent.toFixed(1)}% utilization</span>
                                    </div>
                                    <div class="route-path mt-2">
                                        <strong>Route:</strong> Factory → ${route.stops.map(s => s.depot_name).join(' → ')} → Factory
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="route-metrics">
                                        <div class="metric-row">
                                            <span>Distance:</span> <strong>${route.total_distance_km.toFixed(1)} km</strong>
                                        </div>
                                        <div class="metric-row">
                                            <span>Cost:</span> <strong>₹${route.total_cost.toFixed(0)}</strong>
                                        </div>
                                        <div class="metric-row">
                                            <span>Workers:</span> <strong>${totalWorkers}</strong>
                                        </div>
                                        <div class="metric-row">
                                            <span>Efficiency:</span> <strong>₹${(route.total_cost / totalWorkers).toFixed(0)}/worker</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Detailed stop information -->
                            <div class="stops-detail mt-3">
                                <h6>Stop Details:</h6>
                                <div class="row">
                                    ${route.stops.map(stop => `
                                        <div class="col-md-4 mb-2">
                                            <div class="stop-info">
                                                <strong>${stop.arrival_order}. ${stop.depot_name}</strong><br>
                                                <small>
                                                    Pickup: ${stop.worker_count} workers<br>
                                                    Total in vehicle: ${stop.cumulative_load || stop.worker_count}
                                                </small>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        resultsContainer.innerHTML = html;

        // Display routes on map if available
        if (window.optimizationMap && result.routes) {
            this.displayRoutes(result.routes, window.optimizationMap);
        }
    }
}

// Global route visualizer instance
window.routeVisualizer = new RouteVisualizer('optimizationMap');

// Override the global displayOptimizationResults function
window.displayOptimizationResults = function(result) {
    window.routeVisualizer.displayOptimizationResults(result);
};