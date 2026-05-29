import { D3ScaleFactory } from "@wimmics/venus-scales";
import { SCALE_DEFAULTS, SCALE_TYPES, MARK_DEFAULTS } from "@wimmics/venus-core";

export class VisualArtifacts {
	constructor({ scaleFactory = new D3ScaleFactory() } = {}) {
		this.scaleFactory = scaleFactory;
		this.scales = new Map();
		this.channels = [];
		this.legends = [];
		this.attributes = [];
		this.layout = {}
	}
	
	reset() {
		this.scales.clear();
		this.channels = [];
		this.legends = [];
		this.attributes = []
		this.layout = {}
	}
	
	toObject() {
		return {
			scales: this.scales,
			channels: this.channels,
			legends: this.legends,
			attributes: this.attributes,
			layout: this.layout
		};
	}
	
	_processScaleChannel({
		mark,
		role = null,
		channel,
		channelConfig,
		data,
		isColorScale
	}) {
		
		const resolvedConfig = this._resolveChannelConfig( mark, channel, channelConfig);
		
		const field = this._resolveChannelDataKey(resolvedConfig);
		const hasValue = resolvedConfig.value !== undefined && resolvedConfig.value !== null;
		
		if (!field && !hasValue) return;
		
		const scaleId = role ? `${mark}.${role}.${channel}` : `${mark}.${channel}`;
		
		let scaleResult = null
		if (field) {
			scaleResult = this.scaleFactory.createScale({
				scaleConfig: resolvedConfig.scale || {},
				data,
				field,
				isColorScale
			});

			console.log("[_processScaleChannel] scaleResult = ", scaleResult)
			
			if (scaleResult?.scale) {
				this.scales.set(scaleId, scaleResult.scale);
			}
		}
		
		this.channels.push({
			mark,
			role,
			channel,
			field,
			scaleId: field ? scaleId : null,
			encoding: resolvedConfig,
			defaultValue: resolvedConfig.value
		});
		
		if (field) {
			this.legends.push({
				field: field,
				type: channel,
				mark,
				role,
				scaleId,

				scaleType: scaleResult.scaleType,
				isThreshold: scaleResult.isThreshold,

				samples: scaleResult.samples,

				domain: scaleResult.domain,
				range: scaleResult.range,

				...resolvedConfig.legend,
				title: resolvedConfig.legend.title || field
			});
		}
	}
	
	_processTooltip({ mark, role = null, tooltipConfig }) {
		if (!Array.isArray(tooltipConfig?.fields)) return;
		
		this.channels.push({
			mark,
			role,
			channel: "tooltip",
			fields: tooltipConfig.fields
		});
	}
	
	_resolveChannelConfig(mark, channel, channelConfig = {}) {
		const defaults = MARK_DEFAULTS?.[mark]?.[channel] || {};
		
		return {
			...defaults,
			...(channelConfig || {}),
			legend: {
				...(MARK_DEFAULTS?.[mark]?.legend || {}),
				...(defaults.legend || {}),
				...(channelConfig?.legend || {})
			},
			scale: channelConfig?.scale
			? {
				...(defaults.scale || {}),
				...channelConfig.scale
			}
			: defaults.scale || null
		};
	}
	
	_resolveAttributeConfig(mark, attribute, attributeConfig = {}) {
		const defaults = MARK_DEFAULTS?.[mark]?.[attribute] || {};
		
		const cleanConfig = Object.fromEntries(
			Object.entries(attributeConfig || {}).filter(([, value]) => value !== undefined)
		);
		
		return {
			...defaults,
			...cleanConfig
		};
	}
	
	_resolveChannelDataKey(channelConfig) {
		if (typeof channelConfig?.field === "string" && channelConfig.field.trim()) {
			return channelConfig.field;
		}
		
		if (typeof channelConfig?.metric === "string" && channelConfig.metric.trim()) {
			return channelConfig.metric;
		}
		
		return null;
	}
	
	_processAttribute({
		mark,
		attribute,
		attributeConfig,
		role = null
	}) {
		console.log("original config = ", attributeConfig)
		const resolvedConfig = this._resolveAttributeConfig(
			mark,
			attribute,
			attributeConfig
		);
		console.log(mark, attribute, "resolvedConfig = ", resolvedConfig)
		if (!resolvedConfig || typeof resolvedConfig !== "object") return;
		
		this.attributes.push({
			mark,
			role,
			attribute,
			...resolvedConfig,
			encoding: resolvedConfig
		});
	}
	
	_getAttribute(mark, attribute, role = null) {
		return this.attributes.find(
			(item) =>
				item.mark === mark &&
			item.attribute === attribute &&
			item.role === role
		);
	}
}