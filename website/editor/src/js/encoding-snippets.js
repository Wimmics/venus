import { SCALE_TYPES, LEGEND_POSITIONS, VIS_TYPES, MARK_TYPES, CHANNEL_TYPES, ATTRIBUTE_TYPES, ALIGN_TYPES, COLOR_PALETTES, isOrdinalScaleType } from "@wimmics/venus-core"

// -----------------------------------------------
// encoding builder menu's construction functions
//------------------------------------------------

const VISUAL_VARS_DOC = {

    // Visual Encoding
    color: "Controls the color of a mark.",
    size: "Controls the size of a mark.",
    stroke: "Controls the outline color of a mark.",
    strokeWidth: "Controls the outline thickness of a mark.",
    opacity: "Controls the transparency of a mark.",
};

const COMMON_DOC = {
	field:  {
		name: "field",
		description: "Specifies the data field from the SPARQL query results."
	},
	value: {
		name: "value",
		description: "Specifies the numeric value of the property."
	}
}

export class EncodingBuilder{
	constructor() {

		this.instanceId = Math.random().toString(36).slice(2);

    	console.log("EncodingPanelController", this.instanceId);
	}

	async build({ component }) {
		this.component = component // current visualization component (the menu is generated dynamically)

		this.data = [
			{ 
				label: "Components", 
				values: this.buildComponentsSection() 
			},
			{ 
				label: "Channel Properties", 
				values: this.buildChannelPropertiesSection() 
			},
			{
				separator: "Mark-specific Properties"
			},
			{ 
				label: "Nodes", 
				values: this.buildNodePropertiesSection(),
				display: () => [VIS_TYPES.VENUS_GRAPH, VIS_TYPES.VENUS_SANKEY].includes(this.component) ? "grid" : "none" 
			},
			{
				label: "Links",
				values: this.buildLinkPropertiesSection(),
				display: () => [VIS_TYPES.VENUS_GRAPH].includes(this.component) ? "grid" : "none" 
			},
			{
				label: "Bars",
				values: this.buildBarPropertiesSection(),
				display: () => [VIS_TYPES.VENUS_BARCHART].includes(this.component) ? "grid" : "none" 
			},
			{
				label: "Lines",
				values: this.buildLinePropertiesSection(),
				display: () => [VIS_TYPES.VENUS_LINECHART].includes(this.component) ? "grid" : "none" 
			}
		]

		const layoutVisualizations = [VIS_TYPES.VENUS_SANKEY, VIS_TYPES.VENUS_BARCHART]

		if (layoutVisualizations.includes(this.component)) {
			this.data.push({
				separator: "Visualization-specific"
			})

			this.data.push({
				label: "Layout",
				values: this.buildLayoutPropertiesSection()
			})
		}
	}

	buildComponentsSection() {
		const markOptions = [
			{
				value: MARK_TYPES.NODES,
				label: "Nodes",
				snippet: {
					default: `{ "field": null }`,
					[VIS_TYPES.VENUS_SANKEY]: `{ "fields": [] }`
				}
			},
			{
				value: MARK_TYPES.LINKS,
				label: "Links",
				snippet: {
					default: `{ }`,
					[VIS_TYPES.VENUS_SANKEY]: `{ "value": { "field": null }}`
				} 
			},
			{
				value: MARK_TYPES.BARS,
				label: "Bars",
				snippet: `{ }`
			},
			{
				value: MARK_TYPES.LINES,
				label: "Lines",
				snippet: `{ }`
			},
			{
				value: MARK_TYPES.POINTS,
				label: "Points",
				snippet: `{ }`
			}
		];

		const annotationOptions = [
			{
				value: ATTRIBUTE_TYPES.LABELS,
				label: "Labels",
				snippet: `{ "field": null }`,
				description: "Displays a text label for each mark."
			},
			{
				value: ATTRIBUTE_TYPES.TOOLTIP,
				label: "Tooltip",
				snippet: `{ "fields": [], "title": null }`,
            	description: "Displays additional information when hovering over a mark."
			}
		];

		const visualEncodingOptions = this.buildOptions(Object.values(CHANNEL_TYPES)).map(d => {
			return {...d, snippet: `{ "field": null }`, description: VISUAL_VARS_DOC[d.value] ?? null}
		})

		return [
			{ 
				key: "components-mark-type", 
				label: "Mark Type", 
				options: markOptions, 
				action: ({ datum, value }) => {
					return `"${value}": ${datum.snippet?.[this.component] ?? datum.snippet.default ?? datum.snippet}`
				},
				documentation: {
					description: "Creates the graphical elements of the visualization. The required properties depend on the selected mark type.",
					values: markOptions,
					properties: [
						{
							name: "field",
							description: "Specifies the data field used to create graphical elements. Used by node and link marks."
						},
						{
							name: "fields",
							description: "Specifies a list of node definitions. In Sankey diagrams, these create ordered stages ({ field: ... }). In co-occurrence graphs, these create node types."
						}, 
						{
							name: "value", 
							description: "Specifies the data field used to determine the flow value between stages."
						}
					]
				} 
			},
			{ 
				key: "components-visual-encodings", 
				label: "Visual Variables", 
				options: visualEncodingOptions, 
				action: ({ datum, value} ) => `"${value}": ${datum.snippet}`,
				documentation: {
					description: "Defines the visual variables used to represent the data.",
					values: visualEncodingOptions,
					properties: [ COMMON_DOC.field ]
				}
			},
			{ 
				key: "components-annotations", 
				label: "Annotations", 
				options: annotationOptions, 
				action: ({ datum, value} ) => `"${value}": ${datum.snippet}`,
				documentation: {
					description: "Adds textual information to the visualization. The required properties depend on the selected annotation type.",
					values: annotationOptions,
					properties: [
						{
							name: "field",
							description: "Specifies the data field whose values are displayed as labels."
						},
						{
							name: "fields",
							description: "Specifies the list of data fields whose values are displayed in the tooltip."
						},
						{
							name: "title",
							description: "Specifies the title displayed at the top of the tooltip."
						}
					]
				}
			}
		]
	}

	buildChannelPropertiesSection() {

		const dataOptions = [
			{ 
				value: "value", 
				label: "Constant Value",
				description: "Uses the same value for every mark."
			},
			COMMON_DOC.field,
			{ 
				value: "metric", 
				label: "Metric (degree)", 
				disabled: () => this.component !== VIS_TYPES.VENUS_GRAPH,
				description: "Uses a graph metric computed from the graph structure, such as the node degree." 
			}
		]

		const scaleOptions = this.buildOptions(Object.values(SCALE_TYPES))

		const legendOptions = this.buildOptions(Object.values(LEGEND_POSITIONS), false)

		return [
			{ 
				key: "properties-scale", 
				label: "Scale", 
				options: scaleOptions, 
				action: ({ value }) => `"scale": {
						"type": "${value}",
						"range": ${isOrdinalScaleType(value) ? `"Accent"` : null},
						"domain": null
					}`,
				documentation: {
					description: "Maps data values to visual values.",

					properties: [
						{
							name: "type",
							description: "Specifies the type of scale used to map data values to visual variables.",
							values: scaleOptions
						},
						{
							name: "range",
							description: "Specifies the set of visual values produced by the scale. When using colors, provide either a list of colors (names or HEX codes) or the name of a color palette.",
							values: COLOR_PALETTES,
							default: "Accent"
						},
						{
							name: "domain",
							description: "Specifies the input values covered by the scale. When omitted, the domain is automatically inferred from the data.",
							default: null
						}
					]
				}
			},
			{ 
				key: "properties-data", 
				label: "Data", 
				options: dataOptions, 
				action: ({ value }) => `"${value}": null`,
				documentation: {
					description: "Specifies how a channel obtains its values.",
					values: dataOptions
				}
			},
			{ 
				key: "properties-legend", 
				label: "Legend", 
				options: legendOptions,
				action: ({ value }) => `"legend": {
					"position": "${value}",
					"compact": true, 
					"display": true, 
					"title": null
				}`,
				documentation: {
					description: "Controls the appearance of the legend.",
					properties: [
						{
							name: "position",
							description: "Specifies where the legend is displayed.",
							values: legendOptions
						},
						{
							name: "compact",
							description: "Controls whether the legend is displayed in a compact or expanded layout.",
							values: [true, false],
							default: true
						},
						{
							name: "display",
							description: "Controls whether the legend is displayed.",
							values: [true, false],
							default: true
						},
						{
							name: "title",
							description: "Specifies the legend title. Default: field name.",
							default: null
						}
					]
				} 
			}
		]
	}

	buildLayoutPropertiesSection() {
		const alignmentOptions = this.buildOptions(Object.values(ALIGN_TYPES))

		const directionOptions = this.buildOptions(["horizontal", "vertical"])

		return [
			{ 
				key: "layout-alignment", 
				label: "Alignment", 
				options: alignmentOptions, 
				action: ({value}) => `"align": "${value}"`, 
				display: () => this.component === VIS_TYPES.VENUS_SANKEY ? "grid" : "none",
				documentation: {
					description: "Controls the alignment of Sankey stages.",
					values: alignmentOptions
				}
			},
			{
				key: "layout-direction", 
				label: "Direction",
				options: directionOptions,
				action: ({value}) => `"direction": "${value}"`,
				display: () => this.component === VIS_TYPES.VENUS_BARCHART ? "grid" : "none",
				documentation: {
					description: "Specifies the orientation of the bar chart.",
					values: directionOptions
				}
			}
		]
	}

	buildNodePropertiesSection() {
		const nodeTypeOptions = [
			{ 
				value: "source", 
				label: "Source", 
				snippet: `source: { "field": null }`,
				disabled: () => this.component === VIS_TYPES.VENUS_SANKEY,
				description: "Creates the source nodes of a graph." 
			},
			{ 
				value: "target", 
				label: "Target",
				snippet: `target: { "field": null }`, 
				disabled: () => this.component === VIS_TYPES.VENUS_SANKEY,
				description: "Creates the target nodes of a graph." 
			},
			{ 
				value: "stage", 
				label: "Stage",
				snippet: `{ "field": null, "title": null }`, 
				disabled: () => this.component === VIS_TYPES.VENUS_GRAPH,
				description: "Creates a stage of a Sankey diagram." 
			}
		]


		return [
			{ 
				key: "node-type", 
				label: "Type", 
				options: nodeTypeOptions,
				action: ({ datum }) => datum.snippet,
				documentation: {
					description: "Specifies the role of the nodes in the visualization.",
					values: nodeTypeOptions,
					properties: [
						COMMON_DOC.field,
						{
							name: "title",
							description: "Specifies the title displayed below the stage. Used only for Sankey diagrams."
						}
					]
				} 
			},
			this.buildSortObject(),
			{ 
				key: "padding", 
				label: "Padding", 
				action: () => `"padding": { "value": null }`,
				display: () => this.component === VIS_TYPES.VENUS_SANKEY ? "grid" : "none",
				documentation: {
					description: "Controls the vertical spacing between adjacent Sankey nodes.",
					properties: [ COMMON_DOC.value ]
				}
			},
			{ 
				key: "width", 
				label: "Size", 
				action: () => `"size": { "value": null }`,
				display: () => this.component === VIS_TYPES.VENUS_SANKEY ? "grid" : "none",
				documentation: {
					description: "Controls the fixed width of Sankey nodes.",
					properties: [ COMMON_DOC.value ]
				}
			}
		]
	}

	buildLinkPropertiesSection() {
		const linkOptions = [
			{ 
				value: "directional", 
				label: "Directional", 
				snippet: "",
				description: "Creates directed links from source nodes to target nodes."
			},
			{ 
				value: "semantic", 
				label: "Semantic",
				snippet: `"relation": { "field": null }`,
				description: "Creates links representing semantic relationships."
			},
			{ 
				value: "cooccurrence", 
				label: "Co-occurrence",
				snippet: `"relation": { "field": null }`,
				description: "Creates links between nodes that share the same context."
				
			}
		]

		return [
			{ 
				key: "type", 
				label: "Link Type", 
				options: linkOptions,
				action: ({datum, value}) => `"type": "${value}", ${datum.snippet}`,
				documentation: {
					description: "Specifies how links are interpreted and constructed.",

					properties: [
						{
							name: "type",
							description: "Specifies the type of links to create.",
							values: linkOptions
						},
						{
							name: "relation",
							description: "Specifies the data field containing the relationship between source and target nodes. Used only with semantic links."
						},
						{
							name: "context",
							description: "Specifies the data field whose shared values determine co-occurrence links. Used only with co-occurrence links."
						}
					]
				}
			},
			{ 
				key: "distance", 
				label: "Distance", 
				action: () => `"distance": { "value": null }`,
				documentation: {
					description: "Controls the preferred distance between connected nodes in the graph.",
					properties: [ COMMON_DOC.value ]
				}
			}
		]
	}

	buildBarPropertiesSection() {
		const stackOptions = [
				{ 
					value: true, 
					label: "Simple",
					snippet: `"stack": true`
				},
				{ 
					value: "normalize", 
					label: "Normalize (100%)",
					snippet: `"stack": "normalize"` 
				}  
			]

		return [
			{ 
				key: "bars-stack", 
				label: "Stacked", 
				options: stackOptions,
				action: ({datum}) => datum.snippet,
				documentation: {
					description: "Defines how values are stacked within each bar.",

					properties: [
						{
							name: "Simple",
							description: "Stacks values using their original magnitudes."
						},
						{
							name: "Normalize (100%)",
							description: "Stacks values as proportions so that each bar represents 100%."
						}
					]
				}
			},
			{ 
				key: "bars-groups", 
				label: "Groups", 
				action: () => `"groups": { "field": null }`,
				documentation: {
					description: "Specifies how bars are grouped.",
					properties: [ COMMON_DOC.field ]
				}
			}
		]
	}

	buildLinePropertiesSection() {
		return [
			{ 
				key: "lines-groups", 
				label: "Groups", 
				action: () => `"groups": { "field": null }`,
				documentation: {
					description: "Specifies how data is split into multiple lines.",
					properties: [ COMMON_DOC.field ]
				}
			}
		]
	}
	
	buildSortObject() {
		const orderOptions = [
			{
				value: "asc",
				label: "Ascending",
				description: "Sorts values from smallest to largest."
			},
			{
				value: "desc",
				label: "Descending",
				description: "Sorts values from largest to smallest."
			}
		]

		const byOptions = [
			{
				value: "layout",
				label: "Layout",
				description: "Preserves the order produced by the layout algorithm."
			},
			{
				value: "alpha",
				label: "Alphabetical",
				description: "Sorts nodes alphabetically according to their labels."
			},
			{
				value: "count",
				label: "Links Count",
				description: "Sorts nodes according to the number of associated links."
			},
			{
				value: "value",
				label: "Links Value",
				description: "Sorts nodes according to the total value represented by their associated links."
			}
		]

		const modeOptions = [
			{
				value: "total",
				label: "All links",
				description: "Computes the sorting criterion using both incoming and outgoing links."
			},
			{
				value: "in",
				label: "Incoming links",
				description: "Computes the sorting criterion using only the incoming links of each node."
			},
			{
				value: "out",
				label: "Outgoing links",
				description: "Computes the sorting criterion using only the outgoing links of each node."
			}
		]

		return { 
			key: "sort", 
			label: "Sort By", 
			
			options: byOptions, 
			
			defaults: {
				order: "desc",
				mode: "total"
			},

			documentation: {
				description: "Controls the ordering of nodes within a stage.",

				properties: [
					{
						name: "by",
						description: "Specifies the criterion used for sorting.",
						values: byOptions
					},
					{
						name: "order",
						description: "Specifies the sorting direction.",
						values: orderOptions,
						default: "desc"
					},
					{
						name: "mode",
						description: "Specifies which links are considered when computing the sorting criterion.",
						values: modeOptions,
						default: "total"
					}
				]
			},

			action: ({datum, value}) => {
				return `"sort": {
					"by": "${value}",
					"order": "desc", 
					"mode": "total"
				}`
			},  
			display: (vis) => vis === VIS_TYPES.VENUS_SANKEY ? "grid" : "none" }
	}

	buildOptions(values, upperCase = true) {
		const capitalizeFirstLetter = (val) => String(val).charAt(0).toUpperCase() + String(val).slice(1);
		return values.map(value => {
			return {
				value: value,
				label: upperCase ? capitalizeFirstLetter(value) : value
			}
		})
	}

	getData() {
		return this.data ?? []
	}

	buildDocumentation(doc) {
	
		let html = `<h5>${doc.description}</h5>`;

		if (doc.values) {
			html += buildValues(doc.values);
		}

		if (doc.properties) {

			html += `<br><h6>Properties</h6>`;
			html += "<table>";

			for (const p of doc.properties) {

				html += `
					<tr>
						<th>${p.name}</th>
						<td>${p.description}</td>
					</tr>
				`;
				
				if (p.values) {
					html += `
						<tr>
							<td colspan="2">
								${buildValues(p.values)}
							</td>
						</tr>
					`;
				}
			}

			html += "</table>";
		}

		function buildValues(values) {
			const hasDescriptions = values.some(v => v.description);

			return hasDescriptions
				? `
					<ul class="tooltip-values">
						${values.map(v => `
							<li><strong>${v.value ?? v}</strong> – ${v.description}</li>
						`).join("")}
					</ul>
				`
				: `
					<div class="tooltip-badges">
						${values.map(v => `
							<span class="badge bg-light text-dark border">${v.value ?? v}</span>
						`).join("")}
					</div>
				`;
		}

		return html;
	}
}