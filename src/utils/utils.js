// Helper to parse YYYY-MM-DD as a local date (not UTC)
export function parseLocalDate(dateString) {
  if (!dateString) return;
  if (dateString instanceof Date) return new Date(dateString);
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Helper to escape HTML special characters
export function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to group items by date (YYYY-MM)
export function groupItemsByDate(items) {
  const groups = {};
  items.forEach(item => {
    if (!item.date || !(item.date instanceof Date)) {
      return;
    }
    const year = item.date.getFullYear();
    const month = item.date.getMonth();
    const key = `${year}-${month}`;
    if (!groups[key]) {
      groups[key] = {
        date: new Date(year, month, 1),
        items: []
      };
    }
    groups[key].items.push(item);
  });
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

// Helper to get today's date with time set to 00:00:00
export function getToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// Helper to get BCD keys for a specific feature, sorted by baseline status
export function getBcdKeysForFeature(featureId, bcdKeys) {
  if (!bcdKeys || !featureId) return [];
  
  const keys = Object.entries(bcdKeys)
    .filter(([_, data]) => data.parent_feature === featureId)
    .map(([id, data]) => ({
      id,
      name: data.name || id,
      baseline: data.status?.baseline,
      baseline_low_date: data.status?.baseline_low_date,
      baseline_high_date: data.status?.baseline_high_date
    }));
  
  // Sort by baseline status: limited-availability (false) > newly-available (low) > widely-available (high)
  return keys.sort((a, b) => {
    // Map baseline values to sort priority
    const getPriority = (baseline) => {
      if (baseline === false || baseline === undefined) return 3; // Limited availability first
      if (baseline === 'low' || baseline === true) return 2; // Newly available second
      return 1; // Widely available (high) last
    };
    
    const priorityA = getPriority(a.baseline);
    const priorityB = getPriority(b.baseline);
    
    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }
    
    // If same priority, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
}
