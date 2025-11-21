# [Timebase](https://rviscomi.github.io/timebase/)

- **Timeline view**: Visualize web features chronologically by their availability dates
- **Browser support**: See which browsers support each feature and their version numbers
- **Developer signals**: See the number of pro-interoperability upvotes for each feature (applies to Limited Availability features only)
- **Deep linking**: Link directly to specific months or features
- **Filtering**: Filter features by browser, status, interop, and predicted support

## [BCD Timeline](https://rviscomi.github.io/timebase/bcd/)

You can also view the [BCD Timeline](https://rviscomi.github.io/timebase/bcd/), which shows similar information grouped at the BCD key level.

Given the higher volume of BCD keys, to keep the app performant, the BCD timeline is limited to the range of 3 calendar months before and after the current date.

Developer signals shown here correspond to the BCD key's _parent feature_, which you can see by expanding the key's details.

## Usage

### Filters

You can filter features by:
- **Browser**: Click on browser tags (e.g., "Chrome 120") to see features available in that version.
- **Status**: Use keyboard shortcuts to filter by Widely Available, Newly Available, Limited Availability, or discouraged features.
- **Interop**: Use keyboard shortcuts to filter by Interop status, or click on Interop tags (e.g., "Interop 2023") to filter by specific years.
- **Predicted**: Use keyboard shortcuts to filter features with upcoming browser support or status changes not yet published in `web-features`. For example, features predicted to become Newly Available based on future browser versions.

Toggle the filter on and off by clicking the tag or pressing the keyboard shortcut again.

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `?` | Show shortcuts dialog |
| `w` | Filter Widely Available features |
| `n` | Filter Newly Available features |
| `l` | Filter Limited Availability features |
| `d` | Filter discouraged features |
| `i` | Filter Interop features |
| `p` | Filter predicted features |
| `c` | Scroll to current month |
| `r` | Reset all filters |

### Deep Linking

You can link directly to specific content in the timeline:

- **Link to a Month**: `https://rviscomi.github.io/timebase/#[month]-[year]`
  - Example: [March 2025](https://rviscomi.github.io/timebase/#march-2025)
- **Link to a Feature**: `https://rviscomi.github.io/timebase/#feature-[feature-id]-[status]`
  - Example: [Container Queries](https://rviscomi.github.io/timebase/#feature-container-queries-widely-available)

## Development

For instructions on how to build, test, and contribute to this project, please see [DEVELOPMENT.md](DEVELOPMENT.md).
