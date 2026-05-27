import { D3ScaleFactory, SCALE_DEFAULTS } from "@wimmics/venus-scales";
import { MARK_DEFAULTS } from "../mark-defaults";

export class VisualArtifacts {
	constructor({ scaleFactory = new D3ScaleFactory() } = {}) {
		this.scaleFactory = scaleFactory;
		this.scales = new Map();
		this.channels = [];
		this.legends = [];
		this.attributes = []
	}
	
	reset() {
		this.scales.clear();
		this.channels = [];
		this.legends = [];
		this.attributes = []
	}
	
	toObject() {
		return {
			scales: this.scales,
			channels: this.channels,
			legends: this.legends,
			attributes: this.attributes
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
		console.log("--------------")
		console.log(mark, channel, "channelConfig = ", channelConfig)
		
		const resolvedConfig = this._resolveChannelConfig( mark, channel, channelConfig);
		console.log("resolvedConfig = ", resolvedConfig)
		
		const field = this._resolveChannelDataKey(resolvedConfig);
		console.log("scale field = ", field)
		const hasValue = resolvedConfig.value !== undefined && resolvedConfig.value !== null;
		
		if (!field && !hasValue) return;
		
		const scaleId = role
		? `${mark}.${role}.${channel}`
		: `${mark}.${channel}`;
		
		
		if (field && resolvedConfig.scale) {
			const scale = this.scaleFactory.createScale({
				scaleConfig: resolvedConfig.scale,
				data,
				field,
				isColorScale
			});
			console.log("scale = ", scale)
			if (scale) {
				this.scales.set(scaleId, scale);
			}
		}
		
		this.channels.push({
			mark,
			role,
			channel,
			field,
			scaleId: field && resolvedConfig.scale ? scaleId : null,
			encoding: resolvedConfig,
			defaultValue: resolvedConfig.value
		});
		
		console.log("channels = ", this.channels)
		
		if (field && resolvedConfig.scale && resolvedConfig?.legend?.display === true) {
			this.legends.push({
				type: channel,
				mark,
				role,
				scaleId,
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