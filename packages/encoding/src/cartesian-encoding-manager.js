import { EncodingManager } from "./encoding-manager.js";
import { getEncodingTemplate, isCountScaleType, SUPPORTED_KEYS } from "@wimmics/venus-core";

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
    
    validateVisSpecificEncoding(userEncoding) {
        const axes = ["x", "y"]

        for (const axis of axes) {
            if (!this._isProvided(userEncoding?.[axis])) {
                throw new Error(`Invalid encoding: "${axis}" is required for ${this.getChartType()}.`)
            }

            if (!userEncoding?.[axis]?.field) {
                throw new Error(`Invalid encoding: "${axis}.field" is required for ${this.getChartType()}.`);
            }

            this._validateField(userEncoding?.[axis]?.field, axis)

            this._validateScales(userEncoding?.[axis], `${axis}`, axis)

            this._validateSupportedKeys(SUPPORTED_KEYS.cartesianLayout, Object.keys(userEncoding?.[axis]), `${axis}`)

            // Axis appearance validation

            const axisAppearance = userEncoding?.[axis]?.axis

            if (!this._isProvided(axisAppearance))
                continue

            if (this._isProvided(axisAppearance?.title)) {
                this._validateDisplay(axisAppearance?.title, `${axis}.axis.title`)
            }

            if (this._isProvided(axisAppearance?.labelAngle) && !this._isNumber(axisAppearance?.labelAngle)) {
                throw new Error(`Invalid encoding: ${axis}.axis.labelAngle must be a number when provided.`)
            }

            if (this._isProvided(axisAppearance?.labelOffset)) {
                if (!this._isNonEmptyObject(axisAppearance?.labelOffset)) {
                    console.warn(`Ignored encoding: "${axis}.axis.labelOffset" is empty. Expected object format: {x, y}.`)
                }

                if (this._isProvided(axisAppearance?.labelOffset?.x) && !this._isNumber(axisAppearance?.labelOffset?.x)) {
                    throw new Error(`Invalid encoding: "${axis}.axis.labelOffset.x" must be a number when provided.` )
                }

                if (this._isProvided(axisAppearance?.labelOffset?.y) && !this._isNumber(axisAppearance?.labelOffset?.y)) {
                    throw new Error(`Invalid encoding: "${axis}.axis.labelOffset.y" must be a number when provided.` )
                }
            }

            if (this._isProvided(axisAppearance?.tickStep)) {

                if (!this._isNonNegativeNumber(axisAppearance?.tickStep)) {
                    console.warn(`Ignored encoding: "${axis}.axis.tickStep" must be a non-negative number when provided. Using default.` )
                }
                
                if (isCountScaleType(userEncoding?.[axis]?.scale?.type) && !Number.isInteger(axisAppearance?.tickStep)) {
                    throw new Error(`Invalid encoding: "${axis}.axis.tickStep" must be an integer for scale type "count" when provided.`)
                }
            }

            if (this._isProvided(axisAppearance?.tickFormat)) {
                if (!this._isNonEmptyString(axisAppearance?.tickFormat)) {
                    console.warn(`Invalid encoding: "${axis}.axis.tickFormat" must be a non-empty string when provided. Using default.`)
                }

                const possibleValues = ["raw", "integer", "percent", "compact", "kmb", "k", "m", "b"]
                if (this._isString(axisAppearance?.tickFormat) && !possibleValues.includes(axisAppearance?.tickFormat.toLowerCase())) {
                    console.warn(`Ignored encoding: "${axisAppearance?.tickFormat}" unknown for ${axis}.axis.tickFormat. Possible values are: ${possibleValues.join(', ')}.`)
                }
            }

            this._validateSupportedKeys(SUPPORTED_KEYS.axis, Object.keys(axisAppearance), `${axis}.axis`)

            
        }
    }
    
    _getByPath(obj, path) {
        return path.split(".").reduce((acc, key) => acc?.[key], obj);
    }
}