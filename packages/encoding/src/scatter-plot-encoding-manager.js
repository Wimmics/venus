import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { VIS_TYPES, getEncodingTemplate, MARK_TYPES } from "@wimmics/venus-core";

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
