import { EncodingManager } from "./encoding-manager.js";
import { getEncodingTemplate } from "@wimmics/venus-core";

/**
 * Base encoding manager for Cartesian (coordinate-based) visualizations.
 * 
 * Provides common encoding logic for 2D chart types (bar, line, scatter plots).
 * Validates and merges X/Y axis encodings with mark-specific properties.
 * Subclasses include BarChartEncodingManager, LineChartEncodingManager, and ScatterPlotEncodingManager.
 * 
 * @extends EncodingManager
 */
export class CartesianEncodingManager extends EncodingManager {

    mergeVisSpecificEncoding(merged, defaults, userEncoding) {
        merged = {
            ...merged,
            x: {
                ...defaults.x,
                ...(userEncoding?.x)
            },
            y: {
                ...defaults.y,
                ...(userEncoding?.y)
            }
        }
    }
    
    validateVisSpecificEncoding(merged) {
        this._validateRequiredXY(merged);
        this._validateCommonCartesianEncoding(merged);
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