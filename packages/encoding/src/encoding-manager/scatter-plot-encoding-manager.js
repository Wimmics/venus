import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { getDefaultEncodingTemplate } from "../default-encodings.js";
import { MARK_TYPES } from "@wimmics/venus-core";

export class ScatterPlotEncodingManager extends CartesianEncodingManager {
	getChartType() {
		return "scatter-plot"
	}
	
	getDefaultEncoding() {
		return getDefaultEncodingTemplate(this.getChartType())
	}
	
	getMarks() {
		return [ MARK_TYPES.POINTS ];
	}
}
