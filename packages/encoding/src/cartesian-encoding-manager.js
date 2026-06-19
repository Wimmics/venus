import { EncodingManager } from "./encoding-manager.js";

export class CartesianEncodingManager extends EncodingManager {
    
    // getDefaultScaleType(path) {
    //     if (path.endsWith(".color")) return SCALE_TYPES.ORDINAL;
    //     if (path === "x") return SCALE_TYPES.LINEAR;
    //     if (path === "y") return "linear";
    //     return "linear";
    // }

    
    mergeEncoding(userEncoding) {
        return this._mergeCartesianEncoding(userEncoding);
    }
    
    validateVisSpecificEncoding(merged) {
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
    
    
    _getByPath(obj, path) {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
    }
}