import { VisualArtifacts } from "./visual-artifacts.js";

export class SankeyVisualArtifacts extends VisualArtifacts {
	_processChartSpecificArtifacts() {
		const { encoding } = this._payload || {};
		const nodes = encoding?.nodes || {};
		const links = encoding?.links || {};

		this.layout = {
			sankey: {
				align: nodes.align || "justify",
				nodeWidth: Number(nodes.width ?? 15),
				nodePadding: Number(nodes.padding ?? 10)
			},
			links: {
				opacity: Number(links?.opacity?.value ?? 0.35)
			}
		};
	}
}
