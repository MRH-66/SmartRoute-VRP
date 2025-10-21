// Environment configuration
const config = {
    // Change this to your backend URL when deployed
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8000'  // Local development
        : 'YOUR_BACKEND_URL_HERE',  // Production backend
};

// Export for use in other files
window.APP_CONFIG = config;
