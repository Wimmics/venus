import { SCALE_TYPES } from "./encoding-objects.js";

export const BASE_DEFAULTS = {
    interactions: {
        tooltip: true
    },

    legend: {
        display: true,
        position: "bottom",
        compact: true
    },

    axis: {
        labelAngle: 0
    },

    colorScale: {
        type: SCALE_TYPES.ORDINAL,
        range: "Accent"
    },

    sizeScale: {
        type: SCALE_TYPES.LINEAR,
        range: [10, 50]
    }
};

export const channel = {

    color(value = null) {
        return {
            value,
            scale: { ...BASE_DEFAULTS.colorScale }
        };
    },

    stroke(value = null) {
        return {
            value,
            scale: { ...BASE_DEFAULTS.colorScale }
        };
    },

    size(value = null) {
        return {
            value,
            scale: { ...BASE_DEFAULTS.sizeScale }
        };
    },

    opacity(value = 1) {
        return {
            value
        };
    },

    strokeWidth(value = 1) {
        return {
            value,
            scale: { ...BASE_DEFAULTS.sizeScale }
        };
    },

    groups() {
        return {}
    }
};

export function labels(display = false) {
    return {
        display
    };
}