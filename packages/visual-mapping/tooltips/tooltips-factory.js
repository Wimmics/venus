import { TooltipManager } from "./tooltip-manager";
import { GraphTooltipManager } from "./graph-tooltip-manager";
import { VIS_TYPES } from "@wimmics/venus-core";

/**
 * Factory function to create a tooltip manager for a specific visualization type.
 * Tooltip managers control the display of contextual information on mark hover.
 *
 * @param {string} visType - The visualization type identifier.
 *   Supported values: 'venus-barchart', 'venus-linechart', 'venus-scatterplot', 'venus-graph', 'venus-sankey'.
 *   See {@link VIS_TYPES} for constants.
 *
 * @param {Object} [opts={}] - Configuration options for the tooltip manager.
 *   @param {HTMLElement} [opts.shadowRoot] - Shadow root context for tooltip rendering.
 *   @param {boolean} [opts.enabled=true] - Whether tooltips are enabled by default.
 *
 * @returns {TooltipManager} A tooltip manager instance configured for the given visualization type.
 *   - For graphs and sankeys: {@link GraphTooltipManager} (supports connection highlighting)
 *   - For other types: {@link TooltipManager} (basic tooltip display)
 *
 * @example
 * import { createTooltipManager } from '@wimmics/venus-visual-mapping';
 * import { VIS_TYPES } from '@wimmics/venus-core';
 *
 * const tooltipMgr = createTooltipManager(VIS_TYPES.VENUS_GRAPH, {
 *   shadowRoot: component.shadowRoot
 * });
 * tooltipMgr.showTooltip({ datum: node, x: 100, y: 200 });
 */
export function createTooltipManager(visType, opts = {}) {
    switch (visType) {
        case VIS_TYPES.VENUS_SANKEY:
        case VIS_TYPES.VENUS_GRAPH:
            return new GraphTooltipManager(opts)
        default:
            return new TooltipManager(opts)
    }
}