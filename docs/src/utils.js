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
