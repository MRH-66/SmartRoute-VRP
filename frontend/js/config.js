// Environment configuration
const config = {
    // Change this to your backend URL when deployed
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8000'  // Local development
        : '',  // No backend - frontend only mode (deploy backend separately to Render.com)
    
    // Backend deployment instructions:
    // 1. Deploy Python backend to Render.com or Railway
    // 2. Get your backend URL (e.g., https://smartroute-backend.onrender.com)
    // 3. Update this line to: API_BASE_URL: 'https://smartroute-backend.onrender.com'
    // 4. Commit and push to trigger Vercel redeploy
};

// Export for use in other files
window.APP_CONFIG = config;
