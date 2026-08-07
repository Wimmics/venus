import { VIS_TYPES } from "./vis-types.js";

import { SCALE_TYPES, SORT_BY, SORT_ORDER } from "./encoding-objects.js";
import { BASE_DEFAULTS, channel, labels } from "./encoding-default-builders.js";

export const SCALE_DEFAULTS = {
	TYPE: SCALE_TYPES.ORDINAL,
	
	BINNING: {
		METHOD: "jenks",
		BINS: 5
	}
}

export const POSITION_DEFAULTS = {

    x: {
        field: null,
        axis: { ...BASE_DEFAULTS.axis },
        scale: {
            type: SCALE_TYPES.LINEAR
        }
    },

    y: {
        field: null,
        axis: { ...BASE_DEFAULTS.axis },
        scale: {
            type: SCALE_TYPES.LINEAR
        }
    }

};


export const MARK_DEFAULTS = {

    bars: {
        color: channel.color("#69b3a2"),
        stroke: channel.stroke(null),
        strokeWidth: channel.strokeWidth(0),
        opacity: channel.opacity(1),
        groups: channel.groups(),
        labels: labels(false), 
        stack: false,
        tooltip: null
    },

    points: {
        display: true,
        color: channel.color("#ccc"),
        size: channel.size(4),
        stroke: channel.stroke("#fff"),
        strokeWidth: channel.strokeWidth(1),
        labels: labels(false),
        tooltip: null
    },

    lines: {
        color: channel.color("#ccc"),
        stroke: channel.stroke("#ccc"),
        strokeWidth: channel.strokeWidth(3),
        groups: channel.groups(),
        labels: labels(false),
        tooltip: null
    },

    nodes: {
        color: channel.color("#69b3a2"),
        size: channel.size(),
        stroke: channel.stroke("#fff"),
        strokeWidth: channel.strokeWidth(1.5),
        labels: labels(true),
        tooltip: null
    },

    links: {
        color: channel.color("#999"),
        stroke: channel.stroke("#999"),
        strokeWidth: channel.strokeWidth(1),
        opacity: channel.opacity(1),
        distance: { value: 100 },
        labels: labels(false),
        tooltip: null
    }

};

export const VISUALIZATION_DEFAULTS = {

    [VIS_TYPES.VENUS_GRAPH]: {

        nodes: {
			...MARK_DEFAULTS.nodes,
            size: {
                metric: "degree",
                ...channel.size()
            }
        },

        links: {
			...MARK_DEFAULTS.links,
            size: channel.size(3),
            distance: { value: 100 },
            type: "directional"
        }

    },

    [VIS_TYPES.VENUS_SANKEY]: {
        align: "justify",
        nodes: {
			...MARK_DEFAULTS.nodes,
            size: channel.size(25),
            padding: 2,
            sort: {
                by: SORT_BY.LAYOUT,
                order: SORT_ORDER.ASC,
                mode: null
            }
        },

        links: {
			...MARK_DEFAULTS.links,
            opacity: channel.opacity(0.35)
        }

    },

	[VIS_TYPES.VENUS_LINECHART]: {
		...POSITION_DEFAULTS,
		points: {
            ...MARK_DEFAULTS.points,
            display: false
        },
		lines: MARK_DEFAULTS.lines
	},

    [VIS_TYPES.VENUS_BARCHART]: {
		...POSITION_DEFAULTS,
		bars: MARK_DEFAULTS.bars,
        x: {
			...POSITION_DEFAULTS.x,
			scale: {
				...POSITION_DEFAULTS.x.scale,
				type: SCALE_TYPES.BAND
			}
		}

    },

	[VIS_TYPES.VENUS_SCATTERPLOT]: {
        ...POSITION_DEFAULTS,
        points: MARK_DEFAULTS.points
    }

};