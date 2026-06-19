import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { getEncodingTemplate, MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core/";

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