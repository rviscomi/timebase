import { browsers } from './data.js';

export function generateICal(featuresToProcess) {
    
    const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Web Features Timeline//Baseline Timeline//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Web Features Timeline',
        'X-WR-CALDESC:Timeline of web features and browser support',
        ''
    ];

    // Process features similar to the main app
    const processedFeatures = [];
    
    // If customFeatures is provided, it's already processed
    if (customFeatures) {
        processedFeatures.push(...customFeatures);
    } else {
        // Process all features from the data
        Object.entries(featuresToProcess)
            .forEach(([id, data]) => {
                // Get all ship dates from browsers
                const shipDates = Object.entries(data.status?.support || {})
                    .map(([browser, version]) => {
                        if (typeof version !== 'string') {
                            return null;
                        }
                        const cleanVersion = version.replace('≤', '');
                        const browserData = browsers[browser];
                        if (!browserData?.releases) {
                            return null;
                        }
                        const release = browserData.releases.find(r => r.version === cleanVersion);
                        if (!release) {
                            return null;
                        }
                        return release.date ? { date: parseLocalDate(release.date), browser, version: cleanVersion } : null;
                    })
                    .filter(item => item !== null);

                if (!shipDates.length) return;

                // Sort ship dates chronologically
                shipDates.sort((a, b) => a.date - b.date);
                
                // The newly available date is when the last browser adds support
                const newlyAvailableDate = shipDates[shipDates.length - 1].date;
                
                // Calculate widely available date (30 months after newly available)
                const widelyAvailableDate = new Date(newlyAvailableDate);
                widelyAvailableDate.setMonth(widelyAvailableDate.getMonth() + 30);
                
                // Get current date for comparison
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                // Always add the newly available entry
                processedFeatures.push({
                    id,
                    name: data.name || id,
                    description: data.description,
                    date: newlyAvailableDate,
                    displayType: 'newly-available',
                    shipDates
                });
                
                // Only add widely available entry if the feature is already available and has full browser support
                if (newlyAvailableDate <= now && data.status?.baseline !== false) {
                    processedFeatures.push({
                        id,
                        name: data.name || id,
                        description: data.description,
                        date: widelyAvailableDate,
                        displayType: 'widely-available',
                        shipDates
                    });
                }
            });
    }

    // Sort features by date in ascending order (earliest first) for chronological order in the calendar
    const sortedFeatures = processedFeatures
        .filter(feature => feature && feature.date && !isNaN(feature.date))
        .sort((a, b) => a.date - b.date);

    // Generate calendar events
    sortedFeatures.forEach(feature => {
        const eventDate = feature.date;
        const formattedDate = formatDateForICal(eventDate);
        
        // Create event title
        const eventType = feature.displayType === 'newly-available' ? '🆕 Newly Available' : '✅ Widely Available';
        const title = `${eventType}: ${feature.name}`;
        
        // Create event description
        const browserInfo = feature.shipDates
            .map(sd => `${sd.browser} ${sd.version}`)
            .join(', ');
        
        const description = `${feature.description || ''}\n\nBrowser Support: ${browserInfo}`;
        
        // Create event
        ical.push(
            'BEGIN:VEVENT',
            `UID:${feature.id}-${feature.displayType}-${formattedDate}@web-features-timeline`,
            `DTSTART;VALUE=DATE:${formattedDate}`,
            `DTEND;VALUE=DATE:${formatDateForICal(new Date(eventDate.getTime() + 24 * 60 * 60 * 1000))}`,
            `SUMMARY:${escapeICalText(title)}`,
            `DESCRIPTION:${escapeICalText(description)}`,
            'CLASS:PUBLIC',
            'STATUS:CONFIRMED',
            'TRANSP:TRANSPARENT',
            'END:VEVENT'
        );
    });

    ical.push('END:VCALENDAR');
    
    return ical.join('\r\n');
}

function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDateForICal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function escapeICalText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

export function downloadICal(selectedFeatures = null) {
    const icalContent = generateICal(selectedFeatures);
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'web-features-timeline.ics';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
} 
