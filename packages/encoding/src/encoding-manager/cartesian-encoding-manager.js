import { EncodingManager } from "./encoding-manager.js";

export class CartesianEncodingManager extends EncodingManager {
    
    getDefaultScaleType(path) {
        if (path.endsWith(".color")) return "ordinal";
        if (path === "x") return "linear";
        if (path === "y") return "linear";
        return "linear";
    }

    
    mergeEncoding(userEncoding) {
        return this._mergeCartesianEncoding(userEncoding);
    }
    
    validateChartSpecificEncoding(merged) {
        this._validateRequiredXY(merged);
        this._validateCommonCartesianEncoding(merged);
    }
    
    _mergeCartesianEncoding(userEncoding) {
        const defaults = this.getDefaultEncoding();
        const merged = {
            ...defaults,
            ...(userEncoding || {}),
            interactions: {
                ...defaults.interactions,
                ...(userEncoding?.interactions || {})
            },
            x: {
                ...defaults.x,
                ...(userEncoding?.x || {})
            },
            y: {
                ...defaults.y,
                ...(userEncoding?.y || {})
            }
        };
        
        for (const mark of this.getMarks()) {
            merged[mark] = this._mergeMark(defaults, userEncoding, mark);
        }
        
        return merged;
    }
    
    _mergeMark(defaults, userEncoding, mark) {
        const channels = this.getMarkChannels(mark);
        const nestedChannels = this.getNestedMarkChannels(mark);
        
        const mergedMark = {
            ...(defaults?.[mark] || {}),
            ...(userEncoding?.[mark] || {})
        };
        
        for (const channel of Object.keys(channels || {})) {
            mergedMark[channel] = {
                ...(defaults?.[mark]?.[channel] || {}),
                ...(userEncoding?.[mark]?.[channel] || {})
            };
        }
        
        for (const channel of Object.keys(nestedChannels || {})) {
            mergedMark[channel] = {
                ...(defaults?.[mark]?.[channel] || {}),
                ...(userEncoding?.[mark]?.[channel] || {})
            };
        }
        
        return mergedMark;
    }
    
    _validateRequiredXY(encoding) {
        if (!encoding?.x?.field || !encoding?.y?.field) {
            throw new Error(
                `Invalid encoding: "x.field" and "y.field" are required for ${this.getChartType()}.`
            );
        }
    }
    
    _validateCommonCartesianEncoding(encoding) {
        if (
            encoding?.interactions?.tooltip !== undefined &&
            typeof encoding.interactions.tooltip !== "boolean"
        ) {
            throw new Error(
                'Invalid encoding: "interactions.tooltip" must be a boolean when provided.'
            );
        }
    }
    
    // populateDomainsFromData(encoding, rows = []) {
    //     if (!Array.isArray(rows) || rows.length === 0) return encoding;
        
    //     const enc = JSON.parse(JSON.stringify(encoding || {}));
        
    //     for (const mark of this.getMarks()) {
    //         this._populateChannelDomain(enc, rows, `${mark}.color`);
    //         this._populateChannelDomain(enc, rows, `${mark}.size`);
    //     }
        
    //     this._populateAxisDomain(enc, rows, "x");
    //     this._populateAxisDomain(enc, rows, "y");
        
    //     return enc;
    // }
    
    // _populateChannelDomain(enc, rows, path) {
    //     const channel = this._getByPath(enc, path);
        
    //     if (!channel?.field || !channel?.scale) return;
        
    //     const scaleType = channel.scale.type || this.getDefaultScaleType(path);
    //     const userDomain = channel.scale.domain;
        
    //     channel.scale.domain = this.domainCalculator.getDomain(
    //         rows,
    //         channel.field,
    //         userDomain,
    //         scaleType
    //     );
    // }
    
    // _populateAxisDomain(enc, rows, axis) {
    //     const channel = enc?.[axis];
        
    //     if (!channel?.field || !channel?.scale) return;
        
    //     const userDomain = channel.scale.domain;
        
    //     if (!Array.isArray(userDomain) || userDomain.length === 0) return;
        
    //     const scaleType = channel.scale.type || this.getDefaultScaleType(axis);
        
    //     channel.scale.domain = this.domainCalculator.getDomain(
    //         rows,
    //         channel.field,
    //         userDomain,
    //         scaleType
    //     );
    // }
    
    
    
    _getByPath(obj, path) {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
    }
}