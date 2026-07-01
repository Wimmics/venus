import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { getEncodingTemplate, MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core";

/**
 * Encoding manager for bar chart visualizations.
 * 
 * Validates and merges bar chart-specific encoding specifications. Bar charts
 * support stacking, grouping, and multiple cartesian axes. Extends CartesianEncodingManager
 * with bar-specific validation (e.g., stack mode validation).
 * 
 * @extends CartesianEncodingManager
 * 
 * @example
 * const manager = createEncodingManager(VIS_TYPES.VENUS_BARCHART);
 * 
 * const encoding = {
 *   bars: {
 *     x: { field: 'category' },
 *     y: { field: 'value' },
 *     color: { field: 'region', scale: { type: 'ordinal', range: 'Set2' } },
 *     stack: 'normalize'
 *   }
 * };
 * manager.validateEncoding(encoding);
 * const merged = manager.mergeEncoding(encoding);
 */
export class BarChartEncodingManager extends CartesianEncodingManager {
	
	getChartType(){
		return VIS_TYPES.VENUS_BARCHART
	}

	getDefaultEncoding() {
		return getEncodingTemplate(this.getChartType())
	}
	
	getMarks() {
		return [ MARK_TYPES.BARS ]
	}
	
	getNestedMarkChannels() {
		return {
			bars: {
				groups: true
			}
		};
	}
	
	afterMergeEncoding(merged, userEncoding) {
		const stack = merged?.bars?.stack;
		
		if (
			stack !== undefined &&
			stack !== true &&
			stack !== false &&
			!(typeof stack === "string" && stack.toLowerCase().trim() === "normalize")
		) {
			throw new Error(
				'Invalid encoding: "bars.stack" must be true, false, or "normalize".'
			);
		}
	}
}