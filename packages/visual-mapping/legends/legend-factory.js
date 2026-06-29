import { ColorLegend } from './color-legend.js';
import { SizeLegend } from './size-legend.js';

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
		
		const legend = item.type === "color" ? new ColorLegend() : new SizeLegend()
		legend.data = data;
		legend.d3Scale = scale;
		legend.encoding = legendEncoding;
		legends.push(legend);
		
	}
	
	return legends;
}


