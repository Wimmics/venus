export const CHANNEL_TYPES = {
	COLOR: "color", 
	SIZE: "size", 
	STROKE: "stroke", 
	STROKE_WIDTH: "strokeWidth"
}

export const MARK_TYPES = {
	NODES: "nodes",
	LINKS: "links", 
	BARS: "bars",
	LINES: "lines",
	POINTS: "points", 
}

export const ATTRIBUTE_TYPES = {
	LABELS: "labels",
	DISTANCE: "distance"
}

export const SCALE_TYPES = {
	ORDINAL: "ordinal",
	LINEAR: "linear",
	COUNT: "count",
	SQRT: "sqrt",
	LOG: "log",
	POW: "pow",
	QUANTITATIVE: "quantitative",
	SEQUENTIAL: "sequential",
	THRESHOLD: "threshold",
	BAND: "band",
	POINT: "point"
};

const QUANTITATIVE_TYPES = new Set([
	SCALE_TYPES.LINEAR,
	SCALE_TYPES.SQRT,
	SCALE_TYPES.LOG,
	SCALE_TYPES.POW,
	SCALE_TYPES.QUANTITATIVE,
	SCALE_TYPES.SEQUENTIAL
]);

export function isColorScale(channel) {
	return channel === CHANNEL_TYPES.COLOR || channel === CHANNEL_TYPES.STROKE;
}

export function normalizeScaleType(type, fallback = SCALE_TYPES.ORDINAL) {
	return typeof type === "string" && type.trim()
	? type.trim()
	: fallback;
}

export function isCountScaleType(type) {
	return SCALE_TYPES.COUNT === normalizeScaleType(type)
}

export function isOrdinalScaleType(type) {
	let normalizedType = normalizeScaleType(type)
	return normalizedType === SCALE_TYPES.ORDINAL || normalizedType === SCALE_TYPES.BAND || normalizedType === SCALE_TYPES.POINT
}

export function isQuantitativeScaleType(type) {
	return QUANTITATIVE_TYPES.has(normalizeScaleType(type));
}

export function isThresholdScaleType(type) {
	return normalizeScaleType(type) == SCALE_TYPES.THRESHOLD
}