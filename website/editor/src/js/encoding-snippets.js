import { SCALE_TYPES, LEGEND_POSITIONS, VIS_TYPES, MARK_TYPES, CHANNEL_TYPES, ATTRIBUTE_TYPES, ALIGN_TYPES } from "@wimmics/venus-core"

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

// -----------------------------------------------
// encoding builder menu's construction functions
//------------------------------------------------

function getDataOptions(){
	return [
		{ value: "value", label: "Constant Value"},
		{ value: "field", label: "Data Field"},
		{ value: "metric", label: "Metric (degree)", disabled: (vis) => vis !== VIS_TYPES.VENUS_GRAPH }
	]
}

function getBooleanOptions(){
	return [true, false].map(value => ({value: value}))
}

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}


function getObjectOptions(obj, upperCase = true) {
	return Object.keys(obj).map(key => {
		const value = obj[key]
		return {
			value: value,
			label: upperCase ? capitalizeFirstLetter(value) : value
		}
	})
}

//----- Channel Properties

function getChannelPropertiesValues(){
	return [
		{ key: "scale", label: "Scale", options: getObjectOptions(SCALE_TYPES), action: (option) => buildScaleSnippet(option) },
		{ key: "data", label: "Data", options: getDataOptions(), action: (option) => buildDataSnippet(option) },
		{ key: "legend", label: "Legend", 
			options: getObjectOptions(LEGEND_POSITIONS, false),
			action: (option) => buildLegendSnippet(option)
		}
	]
}


// ---- Marks (high-level objects)

function getMarksValues(){
	const attributes = [
		{ value: "labels", label: "Labels"},
		{ value: "tooltip", label: "Tooltip"}
	]
	return [
		{ key: "marks-type", label: "Mark", options: getObjectOptions(MARK_TYPES), action: (option, vis) => buildObjectSnippet(option, vis) },
		{ key: "marks-channels", label: "Channels", options: getObjectOptions(CHANNEL_TYPES), action: (option, vis) => buildObjectSnippet(option, vis)},
		{ key: "marks-attributes", label: "Attributes", options: attributes, action: (option, vis) => buildObjectSnippet(option, vis)}
	]
}

// --- Nodes attributes and properties
function getNodesValues() {

	const orderOptions = [
		{ value: "asc", label: "Ascending" },
		{ value: "desc", label: "Descending" }
	]

	const byOptions = [
		{ value: "layout", label: "Layout" },
		{ value: "alpha", label: "Alphabetical" },
		{ value: "count", label: "Links Count" },
		{ value: "value", label: "Links Value" }
	]

	const modeOptions = [
		{ value: "total", label: "All links"},
		{ value: "in", label: "Incoming links"},
		{ value: "out", label: "Outgoing links"}
	]

	return [
		{ key: "node-type", label: "Type", options: [
				{ value: "source", label: "Source", disabled: (vis) => vis === VIS_TYPES.VENUS_SANKEY },
				{ value: "target", label: "Target", disabled: (vis) => vis === VIS_TYPES.VENUS_SANKEY },
				{ value: "stage", label: "Stage", disabled: (vis) => vis === VIS_TYPES.VENUS_GRAPH },
			],
			action: (option) => buildMarkPropertySnippet(null, option)
		},
		{ key: "sort-by", label: "Sort By", options: byOptions, action: (option, vis) => buildMarkPropertySnippet("by", option), display: (vis) => vis === VIS_TYPES.VENUS_SANKEY ? "grid" : "none" },
		{ key: "sort-order", label: "Sort Order", options: orderOptions, action: (option, vis) => buildMarkPropertySnippet("order", option), display: (vis) => vis === VIS_TYPES.VENUS_SANKEY ? "grid" : "none" },
		{ key: "sort-mode", label: "Sort Mode", options: modeOptions, action: (option, vis) => buildMarkPropertySnippet("mode", option), display: (vis) => vis === VIS_TYPES.VENUS_SANKEY ? "grid" : "none" },
		{ key: "align", label: "Alignment", options: getObjectOptions(ALIGN_TYPES), action: (option, vis) => buildMarkPropertySnippet("align", option), display: (vis) => vis === VIS_TYPES.VENUS_SANKEY ? "grid" : "none"},
		{ key: "padding", label: "Padding", action: () => buildValueSnippet("padding"), display: (vis) => vis === VIS_TYPES.VENUS_SANKEY ? "grid" : "none"}
	]
}

// --- links attributes and properties
function getLinksValues(){
	return [
		{ key: "type", label: "Type", options: [
				{ value: "directional", label: "Directional"},
				{ value: "semantic", label: "Semantic"},
				{ value: "cooccurrence", label: "Co-occurrence"}
			],
			action: (option) => buildMarkPropertySnippet("type", option)
		},
		{ key: "distance", label: "Distance", action: () => buildValueSnippet("distance")},
		{ key: "width", label: "Width", action: () => buildValueSnippet("width")}
	]
}

// --- bars attributes and properties
function getBarsValues(){
	return [
		{ key: "stack", label: "Stacked", options: [
			{ value: true, label: "Simple" },
			{ value: "normalize", label: "Normalize" }  ],
			action: (option) => buildMarkPropertySnippet("stack", option) 
		},
		{ key: "groups", label: "Groups", action: () => buildGroupsSnippet() }
	]
}

// ---- lines attributes and properties
function getLinesValues(){
	return [
		{ key: "groups", label: "Groups", action: () => buildGroupsSnippet() },
		{ key: "width", label: "Width", action: () => buildValueSnippet("width")}
	]
}

export function getMenuStructure(){
	return [
		{ label: "Marks", values: getMarksValues() },
		{ label: "Channel Properties", values: getChannelPropertiesValues() },

		{ key: "nodes", label: "Nodes", values: getNodesValues(), display: (vis) => vis === VIS_TYPES.VENUS_GRAPH || vis === VIS_TYPES.VENUS_SANKEY ? "grid" : "none" },
		{ key: "links", label: "Links", values: getLinksValues(), display: (vis) => vis === VIS_TYPES.VENUS_GRAPH ? "grid" : "none" },
		{ key: "bars", label: "Bars", values: getBarsValues(), display: (vis) => vis === VIS_TYPES.VENUS_BARCHART ? "grid" : "none" },
		{ key: "lines", label: "Lines", values: getLinesValues(), display: (vis) => vis === VIS_TYPES.VENUS_LINECHART ? "grid" : "none" }
	]
}

//---------------------------------------
// encoding builder menu's JSON snippets
//---------------------------------------

// build encoding snippets for objects such as marks, channels and attributes
function buildObjectSnippet(object, vis) {
	if (object == ATTRIBUTE_TYPES.TOOLTIP)
		return `"${object}": { "fields": [], "title": null }`
	
	if (object === MARK_TYPES.NODES && vis === VIS_TYPES.VENUS_SANKEY )
		return `"${object}": { "fields": [] }`

	return `"${object}": { "field": null }`
}

// build encoding snippets for channel properties
function buildLegendSnippet(position){
	return `"legend": {
		"position": "${position}",
		"compact": true, 
		"display": true, 
		"title": null
	}`
}

function buildScaleSnippet(type) {
	return `"scale": {
		"type": "${type}",
		"range": null,
		"domain": null
	}`
}

function buildDataSnippet(option){
	return `"${option}": null`
}

function buildGroupsSnippet(){
	return `"groups": { "field": null }`
}

function buildMarkPropertySnippet(property, option) {	
	if (option === "stage") 
		return `{ "field": null, "title": null }` // sankey stages
	
	if (!property && option)
		return `"${option}": { "field": null }` // source, target

	return `"${property}": "${option}"` // all other cases
}

function buildValueSnippet(property) {
	return `"${property}": { "value": null }`
}