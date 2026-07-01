import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { VIS_TYPES, getEncodingTemplate, MARK_TYPES } from "@wimmics/venus-core";

/**
 * Encoding manager for scatter plot visualizations.
 * 
 * Validates and merges scatter plot-specific encoding specifications. Scatter plots
 * support 2D point distributions with color, size, and optional group encodings.
 * Extends CartesianEncodingManager with scatter-specific validation.
 * 
 * @extends CartesianEncodingManager
 * 
 * @example
 * const manager = createEncodingManager(VIS_TYPES.VENUS_SCATTERPLOT);
 * 
 * const encoding = {
 *   points: {
 *     x: { field: 'height' },
 *     y: { field: 'weight' },
 *     color: { field: 'gender', scale: { type: 'ordinal', range: ['blue', 'red'] } },
 *     size: { field: 'age', scale: { type: 'sqrt', range: [30, 300] } }
 *   }
 * };
 * const merged = manager.mergeEncoding(encoding);
 */
export class ScatterPlotEncodingManager extends CartesianEncodingManager {

	getChartType() {
		return VIS_TYPES.VENUS_SCATTERPLOT
	}
	
	getDefaultEncoding() {
		return getEncodingTemplate(this.getChartType())
	}
	
	getMarks() {
		return [ MARK_TYPES.POINTS ];
	}
}
