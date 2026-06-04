import * as d3 from "d3";

import { CHANNEL_TYPES, MARK_TYPES } from "@wimmics/venus-core";

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
		this.encoding = null;
		this._state = null;
		this.visualArtifacts = null;
	}
	
	/**
	* Main render lifecycle: ingest payload, validate, prepare state, render, then finalize.
	*/
	render(payload = {}, encoding = null, visualArtifacts = null) {
		this._ingestRenderPayload(payload);
		this.encoding = encoding || this.encoding;
		this.visualArtifacts = visualArtifacts || {
			scales: new Map(),
			channels: [],
			legends: []
		};
		
		
		if (!this.container) throw new Error(`${this.constructor.name} requires a container element`);
		
		this.svg = d3.select(this.container.querySelector("svg"));
		this.svg.selectAll("*").remove();
		
		this._state = this._createBaseState(payload, this.visualArtifacts);
		const validationMessage = this._validateState();
		if (validationMessage) {
			this._renderCenteredMessage(this._state.width, this._state.height, validationMessage);
			this._onValidationFailed();
			return;
		}
		
		this._prepareRenderState();
		const renderResult = this._renderVis();
		if (renderResult === false) return;
		
		return this._afterRender();
	}
	
	/**
	* Refresh visualization data while optionally overriding encoding/artifacts.
	*/
	updateData(payload = null, encoding = null, visualArtifacts = null) {
		this.render(payload || this._defaultPayload(), encoding || this.encoding, visualArtifacts);
	}
	
	/**
	* Refresh visualization encoding while optionally overriding payload/artifacts.
	*/
	updateEncoding(encoding, payload = null, visualArtifacts = null) {
		this.render(payload || this._defaultPayload(), encoding, visualArtifacts);
	}
	
	/**
	* Update container dimensions and trigger a full render pass.
	*/
	resize(width, height, payload = null, encoding = null, visualArtifacts = null) {
		this.width = width || this.width;
		this.height = height || this.height;
		this.render(payload || this._defaultPayload(), encoding || this.encoding, visualArtifacts);
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
	_createBaseState(payload, visualArtifacts) {
		return {
			payload,
			visualArtifacts,
			encoding: this.encoding,
			mapping: this.encoding || {},
			width: this.width,
			height: this.height
		};
	}
	
	/**
	* Validate prepared state before drawing; return an error message to abort render.
	*/
	_validateState() {
		return null;
	}
	
	/**
	* Hook invoked when validation fails, for subclass cleanup/reset logic.
	*/
	_onValidationFailed() {}
	
	/**
	* Hook to enrich state before the visualization-specific render step.
	*/
	_prepareRenderState() {}
	
	/**
	* Hook invoked after successful drawing for post-render behaviors.
	*/
	_afterRender() {}
	
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
	_retrieveMarkChannels({ marks = [] }) {
		this.channels = {} 		
		for (let channel of Object.values(CHANNEL_TYPES)) {
			if (!this.channels[channel]) this.channels[channel] = {}
			for (let mark of marks) {
				this.channels[channel][mark] = this._getArtifactChannel(mark, channel)
			}
		}

		console.log("channels = ", this.channels)
	}

	_isMarkNodes(mark) { return mark === MARK_TYPES.NODES }

	_resolveChannel(d, mark, channel) {
		return this._isMarkNodes(mark) ? this._resolveNodeChannel(d, channel) : this.channels?.[channel]?.[mark]
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
