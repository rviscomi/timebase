# Development Guide

This guide is intended for developers working on the Timebase project.

## Setup

```bash
# Install dependencies
npm install
```

## Development Workflow

To start a local development server:

```bash
# Start the development server (builds and serves)
npm run dev
```

The development server runs on http://localhost:8080. It will automatically rebuild the project when you run it, but it does not currently support hot module replacement (HMR).

### Other Commands

```bash
# Build the application (extract data, logos, and build pages)
npm run build

# Run tests
npm test

# Update web features data
npm run update

# Stop the server
npm run stop
```

## Project Structure

```
timebase/
├── src/                  # Source code
│   ├── client.js         # Main entry point
│   ├── client-bcd.js     # BCD entry point
│   ├── core/             # Core logic (data processing, timeline app)
│   ├── renderer/         # UI rendering logic
│   └── utils/            # Utility functions
├── data/                 # Generated data files
│   ├── web-features.js   # Data from web-futures
│   └── bcd.js            # Data from MDN BCD
├── scripts/              # Build and maintenance scripts
├── tests/                # Unit tests
├── docs/                 # Generated static site (output of build)
├── images/               # Browser logos
└── package.json          # Project configuration
```

## Data Structure

The application uses two main data sources:

1. **Web Features**: Sourced from the `web-futures` npm package. This data is processed by `scripts/extract-data.js` into `data/web-features.js`.
2. **Browser Compatibility Data (BCD)**: Sourced from `@mdn/browser-compat-data`. This data is processed by `scripts/extract-bcd-data.js` into `data/bcd.js`.

## Architecture

### Core Components

- **TimelineApp**: The main application class that orchestrates data loading, rendering, and event handling.
- **DataProcessor**: Handles the transformation of raw data into a format suitable for the timeline.
- **Renderer**: Responsible for generating the HTML for the timeline.
- **ScrollManager**: Manages scrolling and navigation to specific dates or features.
- **StateManager**: Manages the application state (filters, selection) and synchronizes it with the URL.

## Updating Data

To update the web features data to the latest version:

```bash
npm run update
```

This command will:
1. Update the `web-futures` dependency
2. Run extraction scripts to generate fresh data files in `data/`
