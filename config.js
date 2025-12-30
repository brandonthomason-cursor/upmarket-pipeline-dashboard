// Dashboard Configuration
// Option 2: GitHub Pages + GitHub Actions (FREE - No paid hosting needed!)

const CONFIG = {
    // Option 1: External API endpoint (requires paid hosting)
    // API_URL: 'https://your-api.railway.app/api/dashboard-data',
    
    // Option 2: Use static data.json file (FREE - GitHub Actions updates it)
    // Set to true to use GitHub Actions (recommended - completely free!)
    USE_STATIC_DATA: true,
    
    // Static data file path (use absolute URL for Coda embed)
    DATA_FILE: 'https://brandonthomason-cursor.github.io/upmarket-pipeline-dashboard/data.json',
    
    // Fallback to sample data if API/data.json fails
    USE_SAMPLE_DATA_ON_ERROR: true,
    
    // Refresh interval (milliseconds)
    // Set to 0 to disable auto-refresh
    AUTO_REFRESH_INTERVAL: 0, // 0 = disabled, 300000 = 5 minutes
    
    // Coda embed mode (auto-detected, but can be forced)
    FORCE_CODA_MODE: false
};

// Export for use in dashboard.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

