import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { getEncodingTemplate, isCountScaleType, isQuantitativeScaleType, MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core";

/**
 * Encoding manager for bar chart visualizations.
 * 
 * Validates and merges bar chart-specific encoding specifications. Bar charts
 * support stacking, grouping, and multiple cartesian axes. Extends CartesianEncodingManager
 * with bar-specific validation (e.g., stack mode validation).
 * 
 * @extends CartesianEncodingManager
 */
export class BarChartEncodingManager extends CartesianEncodingManager {
	
	getChartType(){
		return VIS_TYPES.VENUS_BARCHART
	}
	
	getMarks() {
		return [ MARK_TYPES.BARS ]
	}

	validateVisSpecificEncoding(userEncoding) {
		// 1. Validate general Cartesian encoding
		super.validateVisSpecificEncoding(userEncoding)

		// 2. Validate specific bar-chart encoding
		const stack = userEncoding?.bars?.stack;
		const groups = userEncoding?.bars?.groups;
		
		if (this._isProvided(stack) && this._isProvided(groups)) {
			console.warn(`Ignored encoding: "bars" cannot define both "stack" and "groups".` )
		}

		if (this._isProvided(stack)) {
			if ( stack !== true && stack !== false && !(this._isNonEmptyString(stack) && stack.toLowerCase().trim() === "normalize")) {
				throw new Error( 'Invalid encoding: "bars.stack" must be true, false, or "normalize", when provided.');
			}

			if (!this._isProvided(userEncoding?.bars?.color)) {
				console.warn(`Ignored encoding: "bars.stack" requires "bars.color". Without a color channel, "bars.stack" is ignored.`);
			}
		}

		if (this._isProvided(userEncoding?.x?.scale?.type) && (isQuantitativeScaleType(userEncoding?.x?.scale?.type) || isCountScaleType(userEncoding?.x?.scale?.type))) {
			throw new Error(`Invalid encoding: "${userEncoding?.x?.scale?.type}" is not supported for ${this.getChartType()}. Possible x scales: "band".`)	
		}
	}
}