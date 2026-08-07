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
            scale: { ...BASE_DEFAULTS.colorScale },
            legend: {... BASE_DEFAULTS.legend }
        };
    },

    stroke(value = null) {
        return {
            value,
            scale: { ...BASE_DEFAULTS.colorScale },
            legend: {... BASE_DEFAULTS.legend }
        };
    },

    size(value = null) {
        return {
            value,
            scale: { ...BASE_DEFAULTS.sizeScale },
            legend: {... BASE_DEFAULTS.legend }
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
            scale: { ...BASE_DEFAULTS.sizeScale },
            legend: {... BASE_DEFAULTS.legend }
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