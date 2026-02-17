import { createLogger } from "@wimmics/venus-core";

export class SizeRangeCalculator {
  constructor() {
    this.logger = createLogger("SizeRangeCalculator", { debug: false, level: "warn" });
    this.defaultRange = [5, 20];
  }

  createSizeRange({ data, field, scaleType = "linear", range = null, label = "Size" } = {}) {
    const isQuantitative = this._isQuantitativeScale(scaleType);
    const fallbackRange = this._buildAdaptiveFallbackRange(data);

    if (!Array.isArray(range) || range.length === 0) {
      this.logger.warn(`No size range provided (${label}). Using default range [${fallbackRange.join(", ")}].`);
      return fallbackRange;
    }

    if (isQuantitative) {
      const normalized = this._normalizeQuantitativeRange(range);
      if (normalized) return normalized;
      this.logger.warn(`Invalid quantitative size range (${label}): [${range.join(", ")}]. Using default range [${fallbackRange.join(", ")}].`);
      return fallbackRange;
    }

    const ordinalRange = this._normalizeOrdinalRange(range);
    if (ordinalRange.length > 0) return ordinalRange;

    this.logger.warn(`Invalid ordinal size range (${label}): [${range.join(", ")}]. Using default range [${fallbackRange.join(", ")}].`);
    return fallbackRange;
  }

  _buildAdaptiveFallbackRange(data) {
    const count = Array.isArray(data) ? data.length : 0;
    if (count > 300) return [2, 10];
    if (count > 120) return [3, 14];
    return [...this.defaultRange];
  }

  _normalizeQuantitativeRange(range) {
    const numericRange = range
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (numericRange.length < 2) return null;

    const minValue = Math.min(...numericRange);
    const maxValue = Math.max(...numericRange);
    if (maxValue <= 0) return null;

    const safeMin = minValue > 0 ? minValue : 1;
    if (safeMin === maxValue) return [safeMin, safeMin + 1];

    return [safeMin, maxValue];
  }

  _normalizeOrdinalRange(range) {
    return range
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  _isQuantitativeScale(scaleType) {
    return (
      scaleType === "linear" ||
      scaleType === "sqrt" ||
      scaleType === "log" ||
      scaleType === "quantitative" ||
      scaleType === "sequential"
    );
  }
}

export function createSizeRange(config) {
  const calculator = new SizeRangeCalculator();
  return calculator.createSizeRange(config);
}
