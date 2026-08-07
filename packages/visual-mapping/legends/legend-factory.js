import { ColorLegend } from './color-legend.js';
import { SizeLegend } from './size-legend.js';
import { StrokeWidthLegend } from './stroke-width-legend.js';
import { CHANNEL_TYPES } from '@wimmics/venus-core';

/**
* Factory function to create legend elements from compiled legend descriptors.
* @param {Object} config - Configuration object
* @param {Array} config.legendItems - Compiled legend descriptors
* @param {Object} config.datasets - Data by key ({ nodes, links, ... })
* @param {Function} config.getScaleById - Function to resolve D3 scales by scale id
* @returns {Array<HTMLElement>} Array of legend elements
*/
export function createLegends(config = {}) {
	const legends = [];
	const legendItems = Array.isArray(config.legendItems)
	? config.legendItems
	: [];

	const isColorLegendType = (type) =>
		type === CHANNEL_TYPES.COLOR || type === CHANNEL_TYPES.STROKE;

	const isSizeLegendType = (type) =>
		type === CHANNEL_TYPES.SIZE;

	const isStrokeWidthLegendType = (type) =>
		type === CHANNEL_TYPES.STROKE_WIDTH;
	
	for (const item of legendItems) {
		if (item?.display === false) continue;
		
		const scale = item.scaleId && typeof config.getScaleById === "function" ? config.getScaleById(item.scaleId) : null;
		
		if (!scale) continue;
		
		const legendEncoding = {
			field: item.field,
			scale: {
				domain: item.domain || scale.domain() || [],
				range: item.range || scale.range() || []
			},
			legend: {
				title: item.title || item.field || "Legend",
				position: item.position || "bottom",
				display: true,
				compact: item.compact !== false, 
				isThreshold: item.isThreshold === true,
				samples: item.samples || []
			}
		};
		
		const data = config.datasets?.[item.mark] || [];
		if (!data || !data.length) continue

		let legend = null;
		if (isColorLegendType(item.type)) {
			legend = new ColorLegend();
		} else if (isSizeLegendType(item.type)) {
			legend = new SizeLegend();
		} else if (isStrokeWidthLegendType(item.type)) {
			legend = new StrokeWidthLegend();
		} else {
			console.warn(`Ignored legend: unsupported legend type "${item.type}".`);
			continue;
		}

		legend.data = data;
		legend.d3Scale = scale;
		legend.encoding = legendEncoding;
		legends.push(legend);
		
	}
	
	return legends;
}


