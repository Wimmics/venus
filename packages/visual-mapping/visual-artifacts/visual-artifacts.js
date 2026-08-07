import { D3ScaleFactory } from "../scales/d3-scale-factory";
import { isColorScale, 
	getSupportedChannels,
	getSupportedAttributes} from "@wimmics/venus-core";
	
import { ChartSpaceManager } from "./chart-space-manager";

export class VisualArtifacts {
	constructor({ scaleFactory = new D3ScaleFactory() } = {}) {
		this.scaleFactory = scaleFactory;
		this.scales = new Map();
		this.channels = [];
		this.legends = [];
		this.attributes = [];
		this.layout = {}

		this._payload = {}

		this.chartSpaceManager = new ChartSpaceManager()
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

		for (let channel of getSupportedChannels(mark)) {
			this._processScaleChannel({
				mark: mark,
				role: role,
				channel: channel,
				channelConfig: config?.[channel],
				data: data,
				isColorScale: isColorScale(channel)
			});
		}

		
		for (let attribute of getSupportedAttributes(mark)) {
			this._processAttribute({
				mark: mark,
				attribute: attribute,
				attributeConfig: config?.[attribute],
				role: role
			})
		}
		
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
		const hasValue = channelConfig?.value !== undefined && channelConfig?.value !== null;
		
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
		
		if (field && scaleResult?.scale) {
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

				...channelConfig?.legend,
				title: channelConfig?.legend?.title || field
			});
		}
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
		if (attributeConfig == null) return;

		this.attributes.push({
			mark,
			role,
			attribute,
			...attributeConfig,
			encoding: attributeConfig
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