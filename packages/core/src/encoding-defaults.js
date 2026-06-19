import { VIS_TYPES } from "./vis-types.js";

import { SCALE_TYPES } from "./encoding-objects.js";

export const SCALE_DEFAULTS = {
	TYPE: SCALE_TYPES.ORDINAL,
	
	BINNING: {
		METHOD: "jenks",
		BINS: 5
	},
	
	COLOR: {
		FALLBACK(mark) {
			switch (mark) {
				case 'links':
				return "#999"
				
				default:
				return "#ccc"
			}
		} 
	},
	
	SIZE: {
		FALLBACK(mark) {            
			switch (mark) {
				case "nodes":
				return 10;
				
				case "links":
				return 1.5;
				
				case "bars":
				return 0;
				
				case "points":
				return 4;
				
				case "lines":
				return 2;
				
				default:
				return 1;
			}
		}
	},
	RANGE: [4, 20],
	THRESHOLD_RANGE: [4, 8, 12, 16, 20]
}

export const COMMON_DEFAULTS = {
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
	}
}

export const CARTESIAN_DEFAULTS = {
	x: { 
		FALLBACK(visType) {
			return {
				field: null,
				axis: COMMON_DEFAULTS.axis,
				scale: { type: visType === VIS_TYPES.VENUS_BARCHART ? SCALE_TYPES.ORDINAL : SCALE_TYPES.LINEAR }
			}
		}	
	},
	y: { 
		field: null,
		axis: COMMON_DEFAULTS.axis, 
		scale: { type: SCALE_TYPES.LINEAR }
	}
}

export const MARK_DEFAULTS = {
	bars: {
		color: { value: "#69b3a2" },
		size: { value: 0 },
		labels: {
			display: false
		},
		legend: COMMON_DEFAULTS.legend
	},
	
	points: {
		display: true,
		color: { value: "#ccc" },
		stroke: { value: "#fff"},
		size: { value: 4 },
		labels: {
			display: false
		},
		legend: COMMON_DEFAULTS.legend
	},
	
	lines: {
		color: { value: "#ccc" },
		size: { value: 3 },
		labels: {
			display: false
		},
		legend: COMMON_DEFAULTS.legend
	},
	
	nodes: {
		color: { value: "#69b3a2" },
		size: {
			metric: "degree",
			scale: {
				type: "linear",
				range: [10, 40]
			}
		},
		stroke: {
			value: "#ffffff"
		},
		strokeWidth: {
			value: 1.5
		},
		labels: {
			display: true
		},
		legend: COMMON_DEFAULTS.legend
	},
	
	links: {
		color: { value: "#999" },
		size: { value: 3 },
		distance: { value: 100 },
		labels: {
			display: false
		},
		legend: COMMON_DEFAULTS.legend,
		
	}
};

