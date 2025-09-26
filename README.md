# Timebase

Timeline of web features and browser support.

## Features

- **Timeline View**: Visualize web features chronologically by their availability dates
- **Browser Support**: See which browsers support each feature and their version numbers
- **Deep Linking**: Link directly to specific months or features
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: Keyboard navigation, screen reader support, and high contrast mode
- **Performance Optimized**: Local storage caching and virtual scrolling for large datasets

## Setup

```bash
# Install dependencies
npm install

# Build the application (extract data and logos)
npm run build
```

## Development

To start a local development server:

```bash
# Start the development server
npm run dev

# Or run individual commands
npm run update        # Update web features data
npm run extract-logos # Extract browser logos
npm run start         # Start the server
```

This will start a Node.js server on http://localhost:8080.

To stop the server when you're done:

```bash
# Option 1: If the terminal is still open, press Ctrl+C

# Option 2: Run the stop script
npm run stop
```

## Deep Linking

You can link directly to specific content in the timeline:

### Link to a Month

```
http://localhost:8080/#[month]-[year]
```

For example:
- http://localhost:8080/#march-2025
- http://localhost:8080/#january-2024

### Link to a Feature

```
http://localhost:8080/#feature-[feature-id]
```

For example:
- http://localhost:8080/#feature-css-container-queries

Each month header and feature includes a clickable link that you can use to copy the URL.

## Updating Data

To update the web features data to the latest version:

```bash
npm run update
```

This command will:
1. Update the `web-futures` dependency to the latest version
2. Run the `extract-data.js` script to generate a fresh `data.js` file

## Project Structure

```
timebase/
├── app.js                # Main application
├── browser-icons.js      # Browser icon configuration
├── data.js               # Generated data from web-futures
├── extract-data.js       # Data extraction script
├── extract-logos.js      # Logo extraction script
├── images/               # Browser logos
├── index.html            # Main HTML file
├── styles.css            # CSS styles
└── package.json          # Project configuration
```

## Data Structure

The application uses two main data structures:

1. `browsers` - Information about browser versions and release dates
2. `features` - Web platform features and their support across browsers

These are extracted from the `web-futures` package and processed to create the timeline visualization.

## Browser Support

The application supports all modern browsers:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Accessibility

The application includes several accessibility features:
- Keyboard navigation for all interactive elements
- ARIA attributes for screen readers
- Skip-to-content link
- High contrast mode support
- Focus indicators

## Performance Optimizations

- Local storage caching of processed feature data
- Error handling and fallbacks
- Virtual scrolling for large datasets
- Debounced event handlers
- Lazy loading of images

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 
