import { VIS_TYPES } from "@wimmics/venus-core";

import { CartesianVisualArtifacts } from "./cartesian-visual-artifacts.js";
import { BarChartVisualArtifacts } from "./barchart-visual-artifacts.js"
import { LineChartVisualArtifacts } from "./linechart-visual-artifacts.js"
import { ForceGraphVisualArtifacts } from "./graph-visual-artifacts.js";
import { SankeyVisualArtifacts } from "./sankey-visual-artifacts.js";
import { VisualArtifacts } from "./visual-artifacts.js";


export function createVisualArtifactsCompiler(visType) {
	switch (visType) {
		case VIS_TYPES.VENUS_SCATTERPLOT: // Scatterplot do not have specific artifacts
			return new CartesianVisualArtifacts()
		case VIS_TYPES.VENUS_BARCHART:
			return new BarChartVisualArtifacts()
		case VIS_TYPES.VENUS_LINECHART:
			return new LineChartVisualArtifacts()
		case VIS_TYPES.VENUS_GRAPH:
			return new ForceGraphVisualArtifacts()
		case VIS_TYPES.VENUS_SANKEY:
			return new SankeyVisualArtifacts()
		default:
			return new VisualArtifacts() 
	}
}

/**
 * Create an empty visual artifacts object with the required structure.
 * Use this to initialize visual artifacts before compilation or as a fallback.
 *
 * @returns {Object} An empty visual artifacts object with the following structure:
 *   - `scales` {Map} - Empty map for scale functions (scale ID → d3 scale)
 *   - `channels` {Array} - Empty array of visual channel specifications
 *   - `legends` {Array} - Empty array of legend definitions
 *   - `attributes` {Array} - Empty array of attribute mappings
 *
 * @example
 * import { emptyVisualArtifacts } from '@wimmics/venus-visual-mapping';
 *
 * const empty = emptyVisualArtifacts();
 * // {
 * //   scales: Map(0),
 * //   channels: [],
 * //   legends: [],
 * //   attributes: []
 * // }
 */
export function emptyVisualArtifacts() {
	return {
		scales: new Map(),
		channels: [],
		legends: [],
		attributes: []
	};
}