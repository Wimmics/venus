import { VIS_TYPES } from "@wimmics/venus-core";
import { CartesianVisualArtifacts } from "./cartesian-visual-artifacts.js";
import { GraphVisualArtifacts } from "./graph-visual-artifacts.js";

export function createVisualArtifactsCompiler(visType) {
	if (
		visType === VIS_TYPES.VENUS_BARCHART ||
		visType === VIS_TYPES.VENUS_LINECHART ||
		visType === VIS_TYPES.VENUS_SCATTERPLOT
	) {
		return new CartesianVisualArtifacts();
	}
	
	if (visType === VIS_TYPES.VENUS_GRAPH) {
		return new GraphVisualArtifacts();
	}
	
	return new VisualArtifacts();
}

export function emptyVisualArtifacts() {
	return {
		scales: new Map(),
		channels: [],
		legends: [],
		attributes: []
	};
}