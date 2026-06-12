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
		
		if (item.type === "color") {
			const legend = new ColorLegend();
			legend.data = data;
			legend.d3Scale = scale;
			legend.encoding = legendEncoding;
			legends.push(legend);
		}
		
		if (item.type === "size") {
			const legend = new SizeLegend();
			legend.data = data;
			legend.d3Scale = scale;
			legend.encoding = legendEncoding;
			legends.push(legend);
		}
	}
	
	return legends;
}

/**
* Helper to position legends in a container
* @param {HTMLElement} container - Container element
* @param {Array<HTMLElement>} legends - Legend elements
* @param {Object} options - Positioning options
*/
export function positionLegends(container, legends, options = {}) {
	const {
		position = 'bottom',
		spacing = 20,
		gap = 20,
		stackGap = 12,
		topInset = 0
	} = options;
	
	const groups = new Map();
	legends.forEach((legend) => {
		const legendPosition = legend?._legendPosition || position;
		if (!groups.has(legendPosition)) groups.set(legendPosition, []);
		groups.get(legendPosition).push(legend);
	});
	
	const getLegendSize = (legend) => {
		const rect = legend.getBoundingClientRect();
		return {
			width: rect.width || 220,
			height: rect.height || 120
		};
	};
	
	const applyStyle = (legend, cssText) => {
		legend.style.cssText = `
      position: absolute;
      width: max-content;
      z-index: 10;
      ${cssText}
    `;
	};
	
	groups.forEach((groupLegends, legendPosition) => {
		if (legendPosition === 'top' || legendPosition === 'bottom') {
			// Top/bottom are centered and laid out horizontally.
			const widths = groupLegends.map((legend) => getLegendSize(legend).width);
			const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, groupLegends.length - 1) * gap;
			const containerWidth = container?.getBoundingClientRect?.().width || 0;
			const availableWidth = Math.max(0, containerWidth - spacing * 2);
			const useEvenLayout = availableWidth > 0 && totalWidth > availableWidth && groupLegends.length > 1;
			let cursor = useEvenLayout ? -availableWidth / 2 : -totalWidth / 2;
			
			groupLegends.forEach((legend, index) => {
				const centerOffset = useEvenLayout
				? (-availableWidth / 2 + (index + 0.5) * (availableWidth / groupLegends.length))
				: (cursor + widths[index] / 2);
				if (legendPosition === 'top') {
					applyStyle(
						legend,
						`top: ${spacing + topInset}px; left: calc(50% + ${centerOffset}px); transform: translateX(-50%);`
					);
				} else {
					applyStyle(legend, `bottom: ${spacing}px; left: calc(50% + ${centerOffset}px); transform: translateX(-50%);`);
				}
				if (!useEvenLayout) {
					cursor += widths[index] + gap;
				}
			});
			return;
		}
		
		const heights = groupLegends.map((legend) => getLegendSize(legend).height);
		
		if (legendPosition === 'left' || legendPosition === 'right') {
			// Left/right are centered vertically and stacked.
			const totalHeight = heights.reduce((sum, height) => sum + height, 0) + Math.max(0, groupLegends.length - 1) * stackGap;
			let cursor = -totalHeight / 2;
			
			groupLegends.forEach((legend, index) => {
				const centerOffset = cursor + heights[index] / 2;
				if (legendPosition === 'left') {
					applyStyle(legend, `left: ${spacing}px; top: calc(50% + ${centerOffset}px); transform: translateY(-50%);`);
				} else {
					applyStyle(legend, `right: ${spacing}px; top: calc(50% + ${centerOffset}px); transform: translateY(-50%);`);
				}
				cursor += heights[index] + stackGap;
			});
			return;
		}
		
		// Corners are stacked vertically.
		let offset = 0;
		groupLegends.forEach((legend, index) => {
			const height = heights[index];
			switch (legendPosition) {
				case 'top-left':
				applyStyle(legend, `top: ${spacing + topInset + offset}px; left: ${spacing}px;`);
				break;
				case 'top-right':
				applyStyle(legend, `top: ${spacing + topInset + offset}px; right: ${spacing}px;`);
				break;
				case 'bottom-left':
				applyStyle(legend, `bottom: ${spacing + offset}px; left: ${spacing}px;`);
				break;
				case 'bottom-right':
				applyStyle(legend, `bottom: ${spacing + offset}px; right: ${spacing}px;`);
				break;
				default:
				applyStyle(legend, `bottom: ${spacing + offset}px; left: ${spacing}px;`);
				break;
			}
			offset += height + stackGap;
		});
	});
}
