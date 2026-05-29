import { VisualArtifacts } from "./visual-artifacts";
import { SCALE_TYPES } from "@wimmics/venus-core";

export class CartesianVisualArtifacts extends VisualArtifacts {
	build({ encoding, rows = [], marks = [], width = null, height = null } = {}) {
		this.reset();
		
		if (!encoding || typeof encoding !== "object") {
			return this.toObject();
		}
		
		for (const mark of marks) {
			this._processMarkArtifacts({
				mark,
				markConfig: encoding?.[mark],
				rows
			});
		}

		this._processLayoutArtifacts({ encoding, rows, width, height })
		
		return this.toObject();
	}
	
	_processMarkArtifacts({ mark, markConfig, rows }) {
		if (!markConfig || typeof markConfig !== "object") return;
		
		this._processScaleChannel({
			mark,
			channel: "color",
			channelConfig: markConfig.color,
			data: rows,
			isColorScale: true
		});
		
		this._processScaleChannel({
			mark,
			channel: "size",
			channelConfig: markConfig.size,
			data: rows,
			isColorScale: false
		});
		
		this._processTooltip({
			mark,
			tooltipConfig: markConfig.tooltip
		});
	}
	
	_processLayoutArtifacts({ encoding, rows, width, height, margin = null }) {
		const finalMargin = {
			top: 20,
			right: 20,
			bottom: 50,
			left: 60,
			...(margin || encoding?.margin || {})
		};
		
		const innerWidth = Math.max(1, Number(width || 800) - finalMargin.left - finalMargin.right);
		const innerHeight = Math.max(1, Number(height || 600) - finalMargin.top - finalMargin.bottom);
		
		const xResult = this.scaleFactory.createLayoutScale({
			scaleConfig: encoding?.x?.scale || {},
			data: rows,
			field: encoding?.x?.field,
			range: [0, innerWidth],
			fallbackType: SCALE_TYPES.ORDINAL
		});
		
		const yResult = this.scaleFactory.createLayoutScale({
			scaleConfig: encoding?.y?.scale || {},
			data: rows,
			field: encoding?.y?.field,
			range: [innerHeight, 0],
			fallbackType: SCALE_TYPES.LINEAR
		});
		
		this.layout = {
			margin: finalMargin,
			innerWidth,
			innerHeight,
			x: {
				field: encoding?.x?.field,
				axis: encoding?.x?.axis || {},
				...xResult
			},
			y: {
				field: encoding?.y?.field,
				axis: encoding?.y?.axis || {},
				...yResult
			}
		};
	}
}