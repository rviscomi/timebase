import { TimelineApp } from './core/TimelineApp.js';
import { features } from '../data/bcd.js';
import { processBcdKeys } from './core/data-processor.js';

// Initialize the app
const app = new TimelineApp({
  idPrefix: 'bcd',
  dataLoader: function () {
    this.bcdKeys = processBcdKeys(bcdKeys, browsers, {
      developerSignals: this.developerSignals,
      interop: this.interopData,
      mdn: this.mdnDocs
    });
    this.allFeatures = [...this.bcdKeys];
    this.features = this.allFeatures;
  }
});
app.loadData();
app.init();

// Scroll to current month on load if no hash
if (!window.location.hash) {
  window.addEventListener('DOMContentLoaded', () => {
    app.scrollToCurrentMonth();
  });
}
