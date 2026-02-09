import { ColorLegend } from './color-legend.js';
import { SizeLegend } from './size-legend.js';

/**
 * Factory function to create legend elements based on encoding configuration
 * @param {Object} config - Configuration object
 * @param {Object} config.colorEncoding - Color encoding configuration { field, scale }
 * @param {Object} config.sizeEncoding - Size encoding configuration { field, scale }
 * @param {Array} config.data - Data array
 * @param {Function} config.getD3Scale - Optional function to get D3 scale instance
 * @returns {Array<HTMLElement>} Array of legend elements
 */
export function createLegends(config) {
  const legends = [];
  const colorEncodings = Array.isArray(config.colorEncoding)
    ? config.colorEncoding
    : [config.colorEncoding].filter(Boolean);

  // Create color legends if color encoding(s) are defined
  colorEncodings.forEach((colorEncoding, index) => {
    if (!colorEncoding?.field || !colorEncoding?.scale) return;
    const colorLegend = new ColorLegend();
    colorLegend.encoding = colorEncoding;
    colorLegend.data = config.data;

    // Attach D3 scale for accurate color rendering
    if (config.getD3Scale) {
      const scaleKey = `node-color-${index}-${colorEncoding.field}`;
      const d3Scale = config.getD3Scale(scaleKey);
      if (d3Scale) colorLegend.d3Scale = d3Scale;
    }

    legends.push(colorLegend);
  });

  // Create size legend if size encoding is defined
  if (config.sizeEncoding?.field && config.sizeEncoding?.scale) {
    const sizeLegend = new SizeLegend();
    sizeLegend.encoding = config.sizeEncoding;
    sizeLegend.data = config.data;

    // Optionally attach D3 scale if provided
    if (config.getD3Scale) {
      const scaleKey = `node-size-${config.sizeEncoding.field}`;
      const d3Scale = config.getD3Scale(scaleKey);
      if (d3Scale) sizeLegend.d3Scale = d3Scale;
    }

    legends.push(sizeLegend);
  }

  return legends;
}

/**
 * Helper to position legends in a container
 * @param {HTMLElement} container - Container element
 * @param {Array<HTMLElement>} legends - Legend elements
 * @param {Object} options - Positioning options
 */
export function positionLegends(container, legends, options = {}) {
  const {
    position = 'bottom-left',
    spacing = 20,
    gap = 270
  } = options;

  legends.forEach((legend, idx) => {
    const baseSpacing = spacing;
    const offset = idx * gap;

    switch (position) {
      case 'bottom-left':
        legend.style.cssText = `
          position: absolute;
          bottom: ${baseSpacing}px;
          left: ${baseSpacing + offset}px;
          z-index: 10;
        `;
        break;
      case 'bottom-right':
        legend.style.cssText = `
          position: absolute;
          bottom: ${baseSpacing}px;
          right: ${baseSpacing + offset}px;
          z-index: 10;
        `;
        break;
      case 'top-left':
        legend.style.cssText = `
          position: absolute;
          top: ${baseSpacing}px;
          left: ${baseSpacing + offset}px;
          z-index: 10;
        `;
        break;
      case 'top-right':
        legend.style.cssText = `
          position: absolute;
          top: ${baseSpacing}px;
          right: ${baseSpacing + offset}px;
          z-index: 10;
        `;
        break;
    }
  });
}
