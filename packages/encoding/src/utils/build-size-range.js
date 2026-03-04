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

  createThresholdSizeRange({
    data,
    field,
    scaleType = "linear",
    range = null,
    bins = 5,
    label = "Size"
  } = {}) {
    const binCount = Number.isFinite(bins) ? Math.max(1, Math.floor(bins)) : 5;
    const normalized = this.createSizeRange({ data, field, scaleType, range, label });

    if (!Array.isArray(normalized) || normalized.length === 0) {
      return Array.from({ length: binCount }, () => 10);
    }

    if (normalized.length >= binCount) {
      return normalized.slice(0, binCount);
    }

    const start = Number(normalized[0]);
    const end = Number(normalized[normalized.length - 1]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || binCount <= 1) {
      return Array.from({ length: binCount }, () => 10);
    }

    return Array.from({ length: binCount }, (_, index) => {
      const ratio = binCount === 1 ? 0 : index / (binCount - 1);
      return start + (end - start) * ratio;
    });
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

export function createThresholdSizeRange(config) {
  const calculator = new SizeRangeCalculator();
  return calculator.createThresholdSizeRange(config);
}
