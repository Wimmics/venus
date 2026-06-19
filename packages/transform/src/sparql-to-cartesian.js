import { SparqlToVisMapper } from "./sparql-to-vis-mapper.js";

export class SparqlToCartesianMapper extends SparqlToVisMapper {
    map(results, ctx = {}) {
        this._assertValidResults(results);
        
        const vars = results.head.vars || [];
        const bindings = results.results.bindings || [];
        const encoding = ctx?.encoding || {};
        
        const rows = this._bindingsToRows(bindings, vars);
        const chart = this._buildCanonicalChart(rows, encoding, vars);
        
        return {
            chart,
            meta: {
                vars,
                encodingUsed: JSON.parse(JSON.stringify(encoding))
            }
        };
    }
    
    _bindingsToRows(bindings = [], vars = []) {
        return bindings.map((binding) => {
            const row = {};
            for (const varName of vars) {
                row[varName] = this._bindingToValue(binding[varName]);
            }
            return row;
        });
    }
    
    _buildCanonicalChart() {
        throw new Error(`${this.constructor.name} must implement _buildCanonicalChart()`);
    }
    
    _toNumber(value, fallback = NaN) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }
    
    _getTooltipFields(tooltipConfig = {}) {
        const fields = tooltipConfig?.field ?? tooltipConfig?.fields;
        
        if (Array.isArray(fields)) return fields;
        if (typeof fields === "string") return [fields];
        
        return null; // null = use all fields
    }
    
    _createTooltipData(row = {}, fields = null) { 
        const selectedFields = Array.isArray(fields) ? fields : Object.keys(row);
        const tooltipData = {};
        
        for (const field of selectedFields) {
            const value = row?.[field];
            if (value !== undefined && value !== null) {
                tooltipData[field] = value;
            }
        }
        
        return tooltipData;
    }
    
    _mergeTooltipData(target = {}, row = {}, fields = null) {
        const selectedFields = Array.isArray(fields) ? fields : Object.keys(row);
        
        for (const field of selectedFields) {
            const value = row?.[field];
            if (value === undefined || value === null) continue;
            
            target[field] = this._mergeUniqueValue(target[field], value);
        }
        
        return target;
    }
    
    _mergeUniqueValue(currentValue, nextValue) {
        if (currentValue === undefined || currentValue === null) return nextValue;
        
        if (Array.isArray(currentValue)) {
            return currentValue.includes(nextValue)
            ? currentValue
            : [...currentValue, nextValue];
        }
        
        return currentValue === nextValue
        ? currentValue
        : [currentValue, nextValue];
    }

}