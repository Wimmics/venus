import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { getDefaultEncodingTemplate } from "../default-encodings.js";

export class ScatterPlotEncodingManager extends CartesianEncodingManager {
  getChartType() {
    return "scatter-plot"
  }

  getDefaultEncoding() {
    return getDefaultEncodingTemplate(this.getChartType())
  }
}
