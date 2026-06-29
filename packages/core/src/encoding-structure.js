import { MARK_DEFAULTS, CARTESIAN_DEFAULTS, COMMON_DEFAULTS } from "./encoding-defaults.js"
import { CHANNEL_TYPES, ATTRIBUTE_TYPES } from "./encoding-objects.js"
import { VIS_TYPES } from "./vis-types.js"

export const MARK_CHANNELS = {
	"nodes": [ CHANNEL_TYPES.COLOR, CHANNEL_TYPES.SIZE, CHANNEL_TYPES.STROKE, CHANNEL_TYPES.STROKE_WIDTH ],
	"links": [ CHANNEL_TYPES.COLOR, CHANNEL_TYPES.STROKE, CHANNEL_TYPES.STROKE_WIDTH, CHANNEL_TYPES.OPACITY ],
	"bars": [ CHANNEL_TYPES.COLOR, CHANNEL_TYPES.STROKE, CHANNEL_TYPES.STROKE_WIDTH ],
	"lines": [ CHANNEL_TYPES.COLOR, CHANNEL_TYPES.STROKE, CHANNEL_TYPES.STROKE_WIDTH ],
	"points": [ CHANNEL_TYPES.COLOR, CHANNEL_TYPES.SIZE, CHANNEL_TYPES.STROKE, CHANNEL_TYPES.STROKE_WIDTH ]
}

export const MARK_ATTRIBUTES = {
	"nodes": [ ATTRIBUTE_TYPES.LABELS ],
	"links": [ ATTRIBUTE_TYPES.DISTANCE, ATTRIBUTE_TYPES.LABELS ],
	"bars": [ ATTRIBUTE_TYPES.LABELS ],
	"lines": [ ATTRIBUTE_TYPES.LABELS ],
	"points": [ ATTRIBUTE_TYPES.LABELS ]
}

export function getEncodingTemplate(visType) {
	switch(visType) {
		case VIS_TYPES.VENUS_SANKEY:
		case VIS_TYPES.VENUS_GRAPH:
			return { 
				nodes: { ...MARK_DEFAULTS.nodes.common, ...MARK_DEFAULTS.nodes.byVisType(visType)}, 
				links: { ...MARK_DEFAULTS.links.common, ...MARK_DEFAULTS.links.byVisType(visType)},
				interactions: COMMON_DEFAULTS.interactions 
			}
		case VIS_TYPES.VENUS_BARCHART:
			return { 
				x: CARTESIAN_DEFAULTS.x.FALLBACK(visType), 
				y: CARTESIAN_DEFAULTS.y,
				bars: MARK_DEFAULTS.bars,
				interactions: COMMON_DEFAULTS.interactions  
			}
		case VIS_TYPES.VENUS_LINECHART:
			return { 
				x: CARTESIAN_DEFAULTS.x.FALLBACK(visType), 
				y: CARTESIAN_DEFAULTS.y,
				lines: MARK_DEFAULTS.lines,
				points: { ...MARK_DEFAULTS.points },
				interactions: COMMON_DEFAULTS.interactions  
			}
		case VIS_TYPES.VENUS_SCATTERPLOT:
			return { 
				x: CARTESIAN_DEFAULTS.x.FALLBACK(visType), 
				y: CARTESIAN_DEFAULTS.y,
				points: MARK_DEFAULTS.points,
				interactions: COMMON_DEFAULTS.interactions  
			}
	}
}

