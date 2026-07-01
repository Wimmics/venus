import { SCALE_TYPES, LEGEND_POSITIONS } from "@wimmics/venus-core"

export const SCENARIO_INDEX_PATH = "./examples/scenarios.index.json";
export const STORAGE_KEY = "venus.editor.selectedScenarioId";

export const VISUALIZATION_TEMPLATES = Object.freeze([
	{
		id: "force-graph-directed",
		label: "Directional Graph",
		component: "venus-graph",
		encodingPath: "./templates/force-graph/directed.json"
	},
	{
		id: "force-graph-semantic",
		label: "Semantic Graph",
		component: "venus-graph",
		encodingPath: "./templates/force-graph/semantic.json"
	},
	{
		id: "force-graph-co-occurrence",
		label: "Co-occurrence Graph",
		component: "venus-graph",
		encodingPath: "./templates/force-graph/co-occurrence.json"
	},
	{
		id: "bar-chart-simple",
		label: "Bar Chart",
		component: "venus-barchart",
		encodingPath: "./templates/bar-chart/simple.json"
	},
	{
		id: "bar-chart-grouped",
		label: "Grouped Bar Chart",
		component: "venus-barchart",
		encodingPath: "./templates/bar-chart/grouped.json"
	},
	{
		id: "bar-chart-stacked",
		label: "Stacked Bar Chart",
		component: "venus-barchart",
		encodingPath: "./templates/bar-chart/stacked.json"
	},
	{
		id: "line-chart-simple",
		label: "Line Chart",
		component: "venus-linechart",
		encodingPath: "./templates/line-chart/simple.json"
	},
	{
		id: "line-chart-multi-line",
		label: "Multi-line Chart",
		component: "venus-linechart",
		encodingPath: "./templates/line-chart/multi-line.json"
	},
	{
		id: "scatter-plot-simple",
		label: "Scatter Plot",
		component: "venus-scatterplot",
		encodingPath: "./templates/scatter-plot/simple.json"
	},
	{
		id: "scatter-plot-bubble",
		label: "Bubble Plot",
		component: "venus-scatterplot",
		encodingPath: "./templates/scatter-plot/bubble.json"
	},
	{
		id: "sankey-simple",
		label: "Sankey Diagram",
		component: "venus-sankey",
		encodingPath: "./templates/sankey/simple.json"
	}
]);

export const DEFAULT_CUSTOM_TEMPLATE_ID = "force-graph-directed";

export function getChannels(){
	return [
		{ key: "color", label: "Color", options: channelsOptions() },
		{ key: "size", label: "Size", options: channelsOptions() },
		{ key: "stroke", label: "Stroke", options: channelsOptions() },
		{ key: "strokeWidth", label: "Stroke Width", options: channelsOptions() },
		{ key: "opacity", label: "Opacity", options: channelsOptions() }	
	]
}

function channelsOptions(){
	return [
		{ key: "value", label: "Value", type: "checkbox", checked: false},
		{ key: "field", label: "Field", type: "checkbox", checked: false}
	]
}

export function getMarks(){
	return [
		{ key: "nodes", label: "Nodes", options: [
				{ label: "Role", selected: true},
				{ key: "source", label: "Source" },
				{ key: "target", label: "Target" },
				{ key: "stage", label: "Stage" },
			]
		},
		{ key: "links", label: "Links", options: [
				{ label: "Type", selected: true},
				{ key: "directional", label: "Directional"},
				{ key: "semantic", label: "Semantic"},
				{ key: "cooccurrence", label: "Co-occurrence"}
			]
		},
		{ key: "bars", label: "Bars", options: [ 
				{ label: "Layout", selected: true},
				{key: "stack", label: "Stacked"},
				{key: "groups", label: "Grouped"}
			]
		},
		{ key: "lines", label: "Lines", options: [
				{ label: "Layout", selected: true},
				{key: "groups", label: "Multi-line"}
			]
		},
		{ key: "points", label: "Points"}
	]
}

export function getScaleOptions(){
	return [{ key: "scale-type", label: "Scale Type", type: "select", values: Object.values(SCALE_TYPES)}]
}

export function getLegendOptions(){
	return [
			{ key: "display", label: "Display", type: "checkbox", checked: true},
			{ key: "compact", label: "Compact", type: "checkbox", checked: true},
			{ key: "title", label: "Title", type: "checkbox", checked: false},
			{ key: "position", label: "Position", type: "select", values: Object.values(LEGEND_POSITIONS)},
		]
}

export function getMenuStructure(){
	return [
		{ label: "Marks", values: getMarks() },
		{ label: "Channels", values: getChannels() },
		{ label: "Scales", values: getScaleOptions() },
		{ label: "Legends", values: getLegendOptions() }
	]
}


