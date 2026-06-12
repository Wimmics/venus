import { VIS_TYPES } from "@wimmics/venus-core";

import { CartesianVisualArtifacts } from "./cartesian-visual-artifacts.js";
import { BarChartVisualArtifacts } from "./barchart-visual-artifacts.js"
import { LineChartVisualArtifacts } from "./linechart-visual-artifacts.js"
import { GraphVisualArtifacts } from "./graph-visual-artifacts.js";


export function createVisualArtifactsCompiler(visType) {
	switch (visType) {
		case VIS_TYPES.VENUS_BARCHART:
			return new BarChartVisualArtifacts()
		case VIS_TYPES.VENUS_LINECHART:
			return new LineChartVisualArtifacts()
		case VIS_TYPES.VENUS_GRAPH:
			return new GraphVisualArtifacts()
		default:
			return new CartesianVisualArtifacts()
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