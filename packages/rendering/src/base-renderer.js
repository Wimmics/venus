import * as d3 from "d3";

import { ATTRIBUTE_TYPES, CHANNEL_TYPES, MARK_ATTRIBUTES, MARK_CHANNELS, MARK_TYPES } from "@wimmics/venus-core";

export default class BaseRenderer {
	/**
	* Initialize renderer-level shared dependencies and mutable rendering state.
	*/
	constructor(opts = {}) {
		this.container = opts.container || null;
		this.width = opts.width || 800;
		this.height = opts.height || 600;
		this.callbacks = opts.callbacks || {};
		this.svg = null;
		
		this._state = null;
		this.visualArtifacts = null;
		this.chartGroup = null;
	}
	
	/**
	* Main render lifecycle: ingest payload, validate, prepare state, render, then finalize.
	*/
	render(payload = {}, visualArtifacts = null) {
		this._ingestRenderPayload(payload);
		this.visualArtifacts = visualArtifacts || this.visualArtifacts || {}

		console.log("visual artifacts =", this.visualArtifacts)
		
		if (!this.container) throw new Error(`${this.constructor.name} requires a container element`);
		
		this.svg = d3.select(this.container.querySelector("svg"));
		this.svg.selectAll("*").remove();

		// group container for chart elements
		this.chartGroup = this.svg.append('g').classed('chart-group', true) 
		
		this._state = this._createBaseState(payload)

		
		this._prepareRenderState(); 
		return this._renderVis();
	}
	
	/**
	* Update container dimensions and trigger a full render pass.
	*/
	resize(width, height, payload = null, visualArtifacts = null) {
		this.width = width || this.width;
		this.height = height || this.height;
		this.render(payload || this._defaultPayload(), visualArtifacts);
	}
	
	/**
	* Tear down rendered SVG output and transient state.
	*/
	destroy() {
		if (this.svg) this.svg.selectAll("*").remove();
		this.svg = null;
		this._state = null;
	}
	
	/**
	* Return the default payload shape used by update helpers when none is provided.
	*/
	_defaultPayload() {
		return {};
	}
	
	/**
	* Parse and store incoming payload into class-level fields (implemented by subclasses).
	*/
	_ingestRenderPayload() {}
	
	/**
	* Build the base render state shared by all renderer types.
	*/
	_createBaseState(payload) {
		return {
			payload,
			width: this.width,
			height: this.height
		};
	}
	
	/**
	* Hook to enrich state before the visualization-specific render step.
	*/
	_prepareRenderState() {}
	
	/**
	* Abstract visualization-specific drawing method implemented by children.
	*/
	_renderVis() {
		throw new Error(`${this.constructor.name} must implement _renderVis()`);
	}
	
	/**
	* Focus/highlight one visual mark and optionally downplay non-focused marks.
	* Children implement the mark-specific SVG logic.
	*/
	_focusMark() {}
	
	/**
	* Reset any focus/downplay styling previously applied by `_focusMark`.
	* Children implement the mark-specific SVG reset logic.
	*/
	_resetFocusMark() {}
	
	/**
	* Render a centered status/error message inside the SVG container.
	*/
	_renderCenteredMessage(width, height, message) {
		this.svg
		.append("text")
		.attr("x", width / 2)
		.attr("y", height / 2)
		.attr("text-anchor", "middle")
		.style("font-size", "14px")
		.text(message);
	}
	
	_getArtifactChannel(mark, channel, role = null) {
		if (!Array.isArray(this.visualArtifacts?.channels)) return null;
		
			return this.visualArtifacts.channels.find((item) =>
				item?.mark === mark && item?.channel === channel && (role == null ? !item?.role : item?.role === role)) || null;
	}

	_getArtifactScale(channel) {
		if (!channel?.scaleId) return null;
		if (!(this.visualArtifacts?.scales instanceof Map)) return null;
		
		return this.visualArtifacts.scales.get(channel.scaleId) || null;
	}

	_getArtifactAttribute(mark, attribute, role = null) {
		if (!Array.isArray(this.visualArtifacts?.attributes)) return null;
		
		return this.visualArtifacts.attributes.find((item) =>
			item?.mark === mark && item?.attribute === attribute && (role == null ? !item?.role : item?.role === role)) || null;
	}

	_resolveScaleValue(d, channel, validate = (value) => value) {
		const fallback = channel?.defaultValue;
		
		const field = channel?.field
		const scale = this._getArtifactScale(channel)
		
		
		if (!field || d[field] == null || !scale) {
			return fallback;
		}
		
		const value = scale(d[field]);

		return validate(value) ? value : fallback;
	}

	// Helper method to centralize channel information per mark
	_retrieveMarkChannels({ marks = [], roles={} }) {
		this.channels = {} 		
	
		for (let mark of marks) {
			for (let channel of MARK_CHANNELS[mark]) {
				if (!this.channels[channel]) this.channels[channel] = {}

				this.channels[channel][mark] = this._getArtifactChannel(mark, channel)
				
				const markRoles = roles[mark] || []
				for (let role of markRoles) {
					if (!this.channels[channel][mark])
						this.channels[channel][mark] = {}

					this.channels[channel][mark][role] = this._getArtifactChannel(mark, channel, role)
				}
			}
		}
	}

	_retrieveMarkAttributes({ marks = [], roles={} }) {
		this.attributes = {} 		
	
		for (let mark of marks) {
			for (let attribute of MARK_ATTRIBUTES[mark]) {
				if (!this.attributes[attribute]) this.attributes[attribute] = {}

				this.attributes[attribute][mark] = this._getArtifactAttribute(mark, attribute)
				
				const markRoles = roles[mark] || []
				for (let role of markRoles) {
					if (!this.attributes[attribute][mark])
						this.attributes[attribute][mark] = {}

					this.attributes[attribute][mark][role] = this._getArtifactAttribute(mark, attribute, role)
				}
			}
		}
	}

	// ----- Helper methods for attributes -----------
	
	_resolveAttribute({ d = null, mark, attribute }) {
		// TODO: why is roles a list? in what case can a value have multiple roles
		const role = Array.isArray(d?.roles) ? d.roles[0] : null;
		
		if (role && this.attributes?.[attribute]?.[mark]?.[role])
			return this.attributes?.[attribute]?.[mark]?.[role]

		return this.attributes?.[attribute]?.[mark]
	}

	_displayLabel(d, mark){
		return this._resolveAttribute({ d, mark, attribute: ATTRIBUTE_TYPES.LABELS })?.display !== false
	}

	_getLabelText(d) {
		if (!d) return "";

		const candidate = d.label ?? d?.datum?.label ?? null;
		const value = Array.isArray(candidate) ? candidate[0] : candidate;

		if (value === undefined || value === null || value === "") return "";
		return String(value);
	}

	

	// ----- Helper methods for channels -------

	_resolveChannel(d, mark, channel) {
		// TODO: why is roles a list? in what case can a value have multiple roles
		const role = Array.isArray(d?.roles) ? d.roles[0] : null;
		
		if (role && this.channels?.[channel]?.[mark]?.[role])
			return this.channels?.[channel]?.[mark]?.[role]

		return this.channels?.[channel]?.[mark]
	}

	// Color scale helpers
	_getMarkColor(d, mark) {
		return this._resolveScaleValue(d, this._resolveChannel(d, mark, CHANNEL_TYPES.COLOR), this._isValidString)
	}

	_getMarkStroke(d, mark) {
		return this._resolveScaleValue(d, this._resolveChannel(d, mark, CHANNEL_TYPES.STROKE), this._isValidString)
	}

	// Size scale helpers
	_getMarkSize(d, mark) {
		return this._resolveScaleValue(d, this._resolveChannel(d, mark, CHANNEL_TYPES.SIZE), this._isPositiveNumber)
	}

	_getMarkStrokeWidth(d, mark) {
		return this._resolveScaleValue(d, this._resolveChannel(d, mark, CHANNEL_TYPES.STROKE_WIDTH), this._isPositiveNumber)
	}

	_isPositiveNumber(value) { return Number.isFinite(value) && value > 0 }

	_isValidString(value) { return typeof value === "string" && value.trim() }
}
