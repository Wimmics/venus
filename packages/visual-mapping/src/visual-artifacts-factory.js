import { VIS_TYPES } from "@wimmics/venus-core";

import { CartesianVisualArtifacts } from "./cartesian-visual-artifacts.js";
import { BarChartVisualArtifacts } from "./barchart-visual-artifacts.js"
import { LineChartVisualArtifacts } from "./linechart-visual-artifacts.js"
import { ForceGraphVisualArtifacts } from "./graph-visual-artifacts.js";
import { SankeyVisualArtifacts } from "./sankey-visual-artifacts.js";
import { VisualArtifacts } from "./visual-artifacts.js";


export function createVisualArtifactsCompiler(visType) {
	switch (visType) {
		case VIS_TYPES.VENUS_SCATTERPLOT: // Scatterplot do not have specific artifacts
			return new CartesianVisualArtifacts()
		case VIS_TYPES.VENUS_BARCHART:
			return new BarChartVisualArtifacts()
		case VIS_TYPES.VENUS_LINECHART:
			return new LineChartVisualArtifacts()
		case VIS_TYPES.VENUS_GRAPH:
			return new ForceGraphVisualArtifacts()
		case VIS_TYPES.VENUS_SANKEY:
			return new SankeyVisualArtifacts()
		default:
			return new VisualArtifacts() 
	}
}

export function emptyVisualArtifacts() {
	return {
		scales: new Map(),
		channels: [],
		legends: [],
		attributes: []
	};
}