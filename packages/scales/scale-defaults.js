import { SCALE_TYPES } from "./scale-types";

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