import { SparqlToVisMapper } from "./sparql-to-vis-mapper.js";
import { bindingToValue } from "./extract-bindings-info.js";

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
                row[varName] = bindingToValue(binding[varName]);
            }
            return row;
        });
    }
    
    _buildCanonicalChart() {
        throw new Error(`${this.constructor.name} must implement _buildCanonicalChart()`);
    }
    
    _getTooltipFields(encoding, markName) {
        const tooltip = encoding?.[markName]?.tooltip;
        const fields = tooltip?.field ?? tooltip?.fields;
        
        if (Array.isArray(fields)) return fields;
        if (typeof fields === "string") return [fields];
        
        return null; // null = all fields
    }
    
    _extractOriginalData(row = {}, fields = null) {
        const selected = Array.isArray(fields) ? fields : Object.keys(row);
        const originalData = {};
        
        for (const field of selected) {
            if (row[field] !== undefined && row[field] !== null) {
                originalData[field] = row[field];
            }
        }
        
        return originalData;
    }
    
    _mergeOriginalData(target = {}, row = {}, fields = null) {
        const selected = Array.isArray(fields) ? fields : Object.keys(row);
        
        for (const field of selected) {
            const value = row[field];
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
    
    _toNumber(value, fallback = NaN) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }
    
    _isValidValue(value) {
        return value !== undefined && value !== null;
    }
    
    _unique(values = []) {
        return Array.from(new Set(values));
    }
    
    _collectUniqueFieldValues(rows = [], field) {
        return this._unique(
            rows
            .map((row) => row?.[field])
            .filter((value) => value !== undefined && value !== null)
        );
    }
    
    _sortByX(rows = [], xScaleType = "point") {
        const type = String(xScaleType || "").toLowerCase();
        const numeric = ["linear", "log", "sqrt", "pow", "count", "quantitative"].includes(type);
        
        return [...rows].sort((a, b) => {
            if (numeric) return Number(a.x) - Number(b.x);
            
            const an = Number(a.x);
            const bn = Number(b.x);
            if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
            
            return (a.index ?? 0) - (b.index ?? 0);
        });
    }
}