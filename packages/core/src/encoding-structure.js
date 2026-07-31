import { VIS_TYPES } from "./vis-types.js"
import { CHANNEL_TYPES, ATTRIBUTE_TYPES } from "./encoding-objects.js"
import { MARK_DEFAULTS, VISUALIZATION_DEFAULTS } from "./encoding-defaults.js"
import { BASE_DEFAULTS } from "./encoding-default-builders.js"

const CHANNEL_KEYS = new Set(Object.values(CHANNEL_TYPES));
const ATTRIBUTE_KEYS = new Set(Object.values(ATTRIBUTE_TYPES));

export function getSupportedChannels(mark) {
    return Object.keys(MARK_DEFAULTS[mark])
        .filter(key => CHANNEL_KEYS.has(key));
}

export function getSupportedAttributes(mark) {
    return Object.keys(MARK_DEFAULTS[mark])
        .filter(key => ATTRIBUTE_KEYS.has(key));
}

export function getEncodingTemplate(visType) {
	return {
		...VISUALIZATION_DEFAULTS[visType],
		interactions: BASE_DEFAULTS.interactions
	}
}

