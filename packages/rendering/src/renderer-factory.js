import ForceGraphRenderer from "./force-graph-renderer.js";
import { SankeyRenderer } from "./sankey-renderer.js";
import BarChartRenderer from "./bar-chart-renderer.js";
import LineChartRenderer from "./line-chart-renderer.js";
import ScatterPlotRenderer from "./scatter-plot-renderer.js";
import BaseRenderer from "./base-renderer.js";

import { VIS_TYPES } from "@wimmics/venus-core";

/**
 * Factory function to create a D3-based renderer for a specific visualization type.
 * Renderers handle all SVG drawing and DOM manipulation for data visualization.
 *
 * @param {string} visType - The visualization type identifier.
 *   Supported values: 'venus-barchart', 'venus-linechart', 'venus-scatterplot', 'venus-graph', 'venus-sankey'.
 *   See {@link VIS_TYPES} for constants.
 *
 * @param {Object} [options={}] - Configuration options for the renderer.
 *   @param {HTMLElement} [options.container] - Target DOM element for SVG rendering.
 *   @param {number} [options.width=800] - Renderer width in pixels.
 *   @param {number} [options.height=600] - Renderer height in pixels.
 *   @param {Object} [options.callbacks] - Event callback handlers.
 *     @param {Function} [options.callbacks.onHover] - Fired when mark is hovered.
 *     @param {Function} [options.callbacks.onOut] - Fired when mark is unhovered.
 *     @param {Function} [options.callbacks.onClick] - Fired when mark is clicked.
 *
 * @returns {BaseRenderer} A renderer instance configured for the given visualization type.
 *   - For bar charts: {@link BarChartRenderer}
 *   - For line charts: {@link LineChartRenderer}
 *   - For scatter plots: {@link ScatterPlotRenderer}
 *   - For node-link graphs: {@link ForceGraphRenderer}
 *   - For sankeys: {@link SankeyRenderer}
 *   - Default: {@link BaseRenderer}
 *
 * @example
 * import { createRenderer } from '@wimmics/venus-rendering';
 * import { VIS_TYPES } from '@wimmics/venus-core';
 *
 * const renderer = createRenderer(VIS_TYPES.VENUS_BARCHART, {
 *   container: document.getElementById('chart'),
 *   width: 800,
 *   height: 600,
 *   callbacks: {
 *     onHover: (datum) => console.log('Hovered:', datum)
 *   }
 * });
 * renderer.render(payload, visualArtifacts);
 */
export function createRenderer(visType, options = {}) {
	switch (visType){
		case VIS_TYPES.VENUS_BARCHART:
			return new BarChartRenderer(options)
		case VIS_TYPES.VENUS_LINECHART:
			return new LineChartRenderer(options)
		case VIS_TYPES.VENUS_SCATTERPLOT:
			return new ScatterPlotRenderer(options)
		case VIS_TYPES.VENUS_GRAPH:
			return new ForceGraphRenderer(options)
		case VIS_TYPES.VENUS_SANKEY:
			return new SankeyRenderer(options)
		default:
			return new BaseRenderer(options)
	}
}

