import { BcdTimelineApp } from './src/BcdTimelineApp.js';

// Initialize the app
const app = new BcdTimelineApp();

// Scroll to current month on load if no hash
if (!window.location.hash) {
  window.addEventListener('DOMContentLoaded', () => {
    app.scrollToCurrentMonth();
  });
}
