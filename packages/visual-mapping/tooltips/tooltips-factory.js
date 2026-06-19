import { TooltipManager } from "./tooltip-manager";
import { GraphTooltipManager } from "./graph-tooltip-manager";
import { VIS_TYPES } from "@wimmics/venus-core";

export function createTooltipManager(visType, opts = {}) {
    switch (visType) {
        case VIS_TYPES.VENUS_SANKEY:
        case VIS_TYPES.VENUS_GRAPH:
            return new GraphTooltipManager(opts)
        default:
            return new TooltipManager(opts)
    }
}