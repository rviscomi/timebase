import { generateTimelineHTML as generateSharedTimelineHTML } from './renderer.js';

export function generateTimelineHTML(bcdKeys) {
  return generateSharedTimelineHTML(bcdKeys, {
    idPrefix: 'bcd',
    renderParentFeature: true,
    getWebStatusId: (item) => item.parent_feature,
    getWebFeaturesId: (item) => item.parent_feature
  });
}
