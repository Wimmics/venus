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
 */
export class ScatterPlotEncodingManager extends CartesianEncodingManager {

	getChartType() {
		return VIS_TYPES.VENUS_SCATTERPLOT
	}
	
	getMarks() {
		return [ MARK_TYPES.POINTS ];
	}
}
