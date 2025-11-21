import { TimelineApp } from './core/TimelineApp.js';

// Initialize the app
const app = new TimelineApp();
app.loadData();
app.init();

// Scroll to current month on load if no hash
if (!window.location.hash) {
  window.addEventListener('DOMContentLoaded', () => {
    app.scrollToCurrentMonth();
  });
}
