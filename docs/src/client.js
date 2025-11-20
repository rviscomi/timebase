import { TimelineApp } from './src/TimelineApp.js';

// Initialize the app
const app = new TimelineApp();

// Scroll to current month on load if no hash
if (!window.location.hash) {
  window.addEventListener('DOMContentLoaded', () => {
    app.scrollToCurrentMonth();
  });
}
