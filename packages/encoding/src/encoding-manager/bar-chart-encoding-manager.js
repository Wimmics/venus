import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { getDefaultEncodingTemplate } from "../default-encodings.js";

export class BarChartEncodingManager extends CartesianEncodingManager {
	getChartType() {
		return "bar-chart";
	}
	
	getDefaultEncoding() {
		return getDefaultEncodingTemplate(this.getChartType())
	}
	
	getMarks() {
		return ["bars"];
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