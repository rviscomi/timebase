# BCD Keys Timeline

This is a variant of the main Baseline Timeline that displays **individual BCD (Browser Compatibility Data) keys** instead of web features.

The BCD version is served from `docs/bcd/index.html`.

## Key Differences

- **Granularity**: Shows individual BCD keys rather than aggregated web features
- **Volume**: Contains many more entries (~22,000 BCD keys vs ~1,300 features)
- **Parent Feature**: Each BCD key card shows which parent feature it belongs to
- **Data Source**: Uses the same web-futures package but displays the `by_compat_key` data

## How to Build and Run

### Build the BCD version:
```bash
npm run build:bcd
```

### Build both versions:
```bash
npm run build:all
```

### Run the BCD version locally:
```bash
npm run start:bcd
```
This will serve the BCD version at http://localhost:8081

### Development mode:
```bash
npm run dev:bcd
```

## Architecture

The BCD version reuses most of the codebase from the main app:

- **Data Extraction**: `extract-bcd-data.js` - Extracts and flattens BCD keys from web-futures
- **Rendering**: `renderer-bcd.js` - Uses shared helpers from `renderer-shared.js`
- **Client Logic**: `client-bcd.js` - Similar to main client but works with BCD keys
- **Build Script**: `build-bcd.js` - Generates static HTML to `docs/bcd/index.html`

## Data Flow

1. `extract-data.js` now preserves `by_compat_key` data (not deleted)
2. `extract-bcd-data.js` reads web-futures data and flattens it into individual BCD keys
3. Each BCD key maintains reference to its parent feature
4. Build process generates static HTML with all BCD keys
5. Client-side JavaScript adds interactivity (filtering, search, etc.)

## Shared Code

Both the main app and BCD version share:
- CSS styles (`styles.css`, `developer-signals.css`, `interop.css`)
- Browser logos (`images/`)
- Rendering helpers (`renderer-shared.js`)
- Calendar export functionality (`ical-generator.js`)
- Developer signals, Interop, and MDN data

This ensures consistency and reduces code duplication.
