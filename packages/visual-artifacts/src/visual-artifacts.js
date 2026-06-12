import { D3ScaleFactory } from "@wimmics/venus-scales";
import { SCALE_DEFAULTS, 
	SCALE_TYPES, 
	MARK_DEFAULTS, 
	CHANNEL_TYPES, 
	MARK_CHANNELS, 
	isColorScale, 
	MARK_ATTRIBUTES} from "@wimmics/venus-core";

export class VisualArtifacts {
	constructor({ scaleFactory = new D3ScaleFactory() } = {}) {
		this.scaleFactory = scaleFactory;
		this.scales = new Map();
		this.channels = [];
		this.legends = [];
		this.attributes = [];
		this.layout = {}

		this._payload = {}
	}

	build(options = {}) {
		this.reset();

		this._payload = { ...options };

		const {
			encoding,
			data = [],
			marks = []
		} = options;

		if (!encoding || typeof encoding !== "object") {
			return this.toObject();
		}

		for (let mark of marks) {
			this._processMarkArtifacts({ 
				mark: mark, 
				config: encoding?.[mark], 
				data: data?.[mark]
			})
		}

		this._processChartSpecificArtifacts()

		this._resolveActiveArtifacts()

		return this.toObject();
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

	_resolveActiveArtifacts() {
		// to be implemented by subclass that need it
	}
	
	_processChartSpecificArtifacts() {
		throw new Error ("_processChartSpecificArtifacts() should be implemented by child class.")
	}

	_processMarkArtifacts({ mark, config, data, role = null }) {

		for (let channel of (MARK_CHANNELS[mark] || [])) {
			this._processScaleChannel({
				mark: mark,
				role: role,
				channel: channel,
				channelConfig: this._resolveChannelConfig( mark, channel, config?.[channel] || {}),
				data: data,
				isColorScale: isColorScale(channel)
			});
		}

		
		for (let attribute of (MARK_ATTRIBUTES[mark] || [])) {
			this._processAttribute({
				mark: mark,
				attribute: attribute,
				attributeConfig: config?.[attribute]
			})
		}
		
		this._processTooltip({
			mark,
			tooltipConfig: config?.tooltip
		});
	}

	_processScaleChannel({
		mark,
		role = null,
		channel,
		channelConfig,
		data,
		isColorScale
	}) {
		
		const field = this._resolveChannelDataKey(channelConfig);
		const hasValue = channelConfig.value !== undefined && channelConfig.value !== null;
		
		if (!field && !hasValue) return;
		
		const scaleId = role ? `${mark}.${role}.${channel}` : `${mark}.${channel}`;
		
		let scaleResult = null
		if (field) {
			scaleResult = this.scaleFactory.createScale({
				scaleConfig: channelConfig.scale || {},
				data,
				field,
				isColorScale
			});
			
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
			encoding: channelConfig,
			defaultValue: channelConfig.value
		});
		
		if (field && scaleResult.scale) {
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

				...channelConfig.legend,
				title: channelConfig.legend.title || field
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
		const resolvedConfig = this._resolveAttributeConfig(
			mark,
			attribute,
			attributeConfig
		);
		
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