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
  SCALE_TYPES.COUNT,
  SCALE_TYPES.SQRT,
  SCALE_TYPES.LOG,
  SCALE_TYPES.POW,
  SCALE_TYPES.QUANTITATIVE,
  SCALE_TYPES.SEQUENTIAL
]);

export function normalizeScaleType(type, fallback = SCALE_TYPES.ORDINAL) {
  return typeof type === "string" && type.trim()
    ? type.trim()
    : fallback;
}

export function isQuantitativeScaleType(type) {
  return QUANTITATIVE_TYPES.has(normalizeScaleType(type));
}

export function isThresholdScaleType(type) {
  return normalizeScaleType(type) == SCALE_TYPES.THRESHOLD
}