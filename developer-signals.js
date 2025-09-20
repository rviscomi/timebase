// Fetches and caches developer signals data from web-features-mappings
let developerSignalsCache = null;

export async function fetchDeveloperSignals() {
    // Return cached data if available
    if (developerSignalsCache) {
        return developerSignalsCache;
    }
    
    try {
        // Use local file to avoid CORS issues
        const response = await fetch('./developer-signals-data.json');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch developer signals: ${response.status}`);
        }
        
        developerSignalsCache = await response.json();
        return developerSignalsCache;
    } catch (error) {
        console.error('Error fetching developer signals:', error);
        // Return an empty object as fallback
        return {};
    }
}
