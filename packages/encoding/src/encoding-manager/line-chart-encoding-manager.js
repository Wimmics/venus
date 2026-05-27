import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { getDefaultEncodingTemplate } from "../default-encodings.js";

export class LineChartEncodingManager extends CartesianEncodingManager {
	getChartType() {
		return "line-chart";
	}
	
	getDefaultEncoding() {
		return getDefaultEncodingTemplate(this.getChartType());
	}
	
	getMarks() {
		return ["lines", "points"];
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