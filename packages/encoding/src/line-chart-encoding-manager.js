import { CartesianEncodingManager } from "./cartesian-encoding-manager.js";
import { VIS_TYPES, getEncodingTemplate, MARK_TYPES } from "@wimmics/venus-core";

/**
 * Encoding manager for line chart visualizations.
 * 
 * Validates and merges line chart-specific encoding specifications. Line charts
 * support multiple series with shared or separate axes. Manages both line and point
 * mark configurations. Extends CartesianEncodingManager with multi-series validation.
 * 
 * @extends CartesianEncodingManager
 * 
 * @example
 * const manager = createEncodingManager(VIS_TYPES.VENUS_LINECHART);
 * 
 * const encoding = {
 *   lines: {
 *     x: { field: 'date' },
 *     y: { field: 'value' },
 *     color: { field: 'series', scale: { type: 'ordinal', range: 'Set1' } }
 *   },
 *   points: { display: true, size: { value: 6 } }
 * };
 * const merged = manager.mergeEncoding(encoding);
 */
export class LineChartEncodingManager extends CartesianEncodingManager {
	
	getChartType() {
		return VIS_TYPES.VENUS_LINECHART
	}

	getDefaultEncoding() {
		return getEncodingTemplate(this.getChartType());
	}
	
	getMarks() {
		return [ MARK_TYPES.LINES, MARK_TYPES.POINTS ];
	}
	
	getNestedMarkChannels() {
		return {
			lines: {
				group: true
			}
		};
	}
	
	afterMergeEncoding(merged, userEncoding) {
		const hasUserPointsConfig =
			userEncoding.points &&
			typeof userEncoding.points === "object";
		
		if (
			hasUserPointsConfig &&
			!Object.prototype.hasOwnProperty.call(userEncoding.points, "display")
		) {
			merged.points.display = true;
		}
	}
}