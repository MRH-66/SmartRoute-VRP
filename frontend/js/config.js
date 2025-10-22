// Environment configuration
const config = {
    // Change this to your backend URL when deployed
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8000'  // Local development
        : '/api',  // Use relative API paths on Vercel (will return to frontend for now)
};

// Export for use in other files
window.APP_CONFIG = config;
