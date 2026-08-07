import { VIS_TYPES } from "./vis-types.js"
import { CHANNEL_TYPES, ATTRIBUTE_TYPES, MARK_TYPES } from "./encoding-objects.js"
import { MARK_DEFAULTS, VISUALIZATION_DEFAULTS } from "./encoding-defaults.js"
import { BASE_DEFAULTS } from "./encoding-default-builders.js"

const CHANNEL_KEYS = new Set(Object.values(CHANNEL_TYPES));
const ATTRIBUTE_KEYS = new Set(Object.values(ATTRIBUTE_TYPES));
const MARK_KEYS = new Set(Object.values(MARK_TYPES))

export const SUPPORTED_KEYS = {
    scale: ["type", "range", "domain", "exponent", "padding", "binning"],
    binning: ["method", "bins", "breaks"],

    cartesianLayout: ["axis", "scale", "field"], // x, y
    axis: ["labelAngle", "labelOffset", "tickStep", "tickFormat"],
    legend: ["display", "position", "compact", "title"],
    tooltip: ["fields", "title"],
    groups: ["field"],
    labels: ["field", "value", "display"],

    interactions: {
        default: ["enabled", "tooltip"],
        nodes: ["zoom", "drag"]
    }, 
    marks: (mark) => getMarkSupportedKeys(mark), 
    channels: {
        default: ["field", "value", "scale", "legend"] ,
        opacity: ["value"]
    }
}

export function isMark(mark) {
    return MARK_KEYS.has(mark)
}

export function getSupportedMarks(visType) {
    return Object.keys(VISUALIZATION_DEFAULTS[visType])
        .filter(key => MARK_KEYS.has(key))
}

export function getSupportedChannels(mark) {
    return Object.keys(MARK_DEFAULTS[mark])
        .filter(key => CHANNEL_KEYS.has(key));
}

export function getSupportedAttributes(mark) {
    return Object.keys(MARK_DEFAULTS[mark])
        .filter(key => ATTRIBUTE_KEYS.has(key));
}

export function getMarkSupportedKeys(mark) {
    return Object.keys(MARK_DEFAULTS[mark])
}

export function getVisSupportedKeys(visType) {
    return Object.keys(getEncodingTemplate(visType))
}

export function getEncodingTemplate(visType) {
	return {
		...VISUALIZATION_DEFAULTS[visType],
		interactions: BASE_DEFAULTS.interactions
	}
}

export function isMetricSupported(mark) {
    return mark === MARK_TYPES.NODES
}

export function isGroupsSupported(mark) {
    return [ MARK_TYPES.BARS, MARK_TYPES.LINES ].includes(mark)
}

