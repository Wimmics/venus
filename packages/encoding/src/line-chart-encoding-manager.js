import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { VIS_TYPES, getEncodingTemplate, MARK_TYPES } from "@wimmics/venus-core";

export class LineChartEncodingManager extends CartesianEncodingManager {
	
	getChartType() {
		return VIS_TYPES.VENUS_LINECHART
	}

	getDefaultEncoding() {
		return getEncodingTemplate(this.getChartType());
	}
	
	getMarks() {
		return [ MARK_TYPES.LINES, MARK_TYPES.POINTS ];
	}
	
	getNestedMarkChannels() {
		return {
			lines: {
				group: true
			}
		};
	}
	
	afterMergeEncoding(merged, userEncoding) {
		const hasUserPointsConfig =
			userEncoding.points &&
			typeof userEncoding.points === "object";
		
		if (
			hasUserPointsConfig &&
			!Object.prototype.hasOwnProperty.call(userEncoding.points, "display")
		) {
			merged.points.display = true;
		}
	}
}