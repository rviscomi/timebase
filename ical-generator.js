export function generateICal(selectedFeatures) {
    
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

    // selectedFeatures is already processed from app.js and contains the specific timeline events
    // Each feature has id, name, description, date, displayType, and shipDates
    // No need to process them again - just use them directly
    
    // Sort features by date in ascending order (earliest first) for chronological order in the calendar
    const sortedFeatures = selectedFeatures
        .filter(feature => feature && feature.date && !isNaN(feature.date))
        .sort((a, b) => a.date - b.date);

    // Generate calendar events
    sortedFeatures.forEach(feature => {
        const eventDate = feature.date;
        const formattedDate = formatDateForICal(eventDate);
        
        // Create event title
        const eventType = feature.displayType === 'newly-available' ? '🆕 Newly Available' : 
                         feature.displayType === 'widely-available' ? '✅ Widely Available' :
                         feature.displayType === 'limited-availability' ? '⚠️ Limited Availability' :
                         '📅 ' + (feature.displayName || feature.displayType);
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

export function downloadICal(selectedFeatures = []) {
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
