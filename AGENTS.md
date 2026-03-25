# Timebase Agent Guide

Timebase is a web application that provides a chronological visualization of web features and their browser support. It allows developers to visualize when features became available across different browsers, view developer signals for limited availability features, and filter results by browser, status, interop, and predicted support.

The project relies on [web-futures](https://github.com/rviscomi/web-futures) as a key dependency to provide a "future" view of the web platform's support landscape, including unreleased browser versions.

---

## Syncing with Web Futures

To synchronize Timebase with the latest version of `web-futures` and browser support data, follow these steps:

### 1. Update Dependencies
Pull down any upstream changes to this repo:

```bash
git pull
```

Run the update script to pull the latest version of `web-futures` and synchronize the project's metadata.

```bash
npm run update
```

> [!NOTE]
> This command updates the `web-futures` dependency to the latest version and runs a suite of metadata extraction scripts (including `extract-data.js`, `extract-bcd-data.js`, `developer-signals.js`, and `interop.js`) to ensure the timeline data is accurate and up-to-date.

### 2. Generate the HTML
Rebuild the static HTML files for the timeline and BCD views.

```bash
npm run build
```

> [!NOTE]
> This command ensures all metadata is fully refreshed and then executes the core build scripts (`scripts/build.js` and `scripts/build-bcd.js`) to generate the final static site in the `docs/` directory.

### 3. Test in the Browser
Start a local development server to verify the updates.

```bash
npm run dev
```

> [!NOTE]
> This command stops any existing local server, performs a full build, and starts a new `http-server` instance (typically on port 8080) so you can interact with the updated timeline in a browser.
