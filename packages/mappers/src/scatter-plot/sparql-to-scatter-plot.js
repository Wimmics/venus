import { SparqlToVisMapper } from "../sparql-to-vis-mapper.js";
import { bindingToValue } from "../extract-bindings-info.js";
import { VIS_TYPES } from "@wimmics/venus-core";

export class SparqlToScatterPlotMapper extends SparqlToVisMapper {
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_SCATTERPLOT });
	}
	
	map(results, ctx = {}) {
		this._assertValidResults(results);
		
		const vars = results.head.vars || [];
		const bindings = results.results.bindings || [];
		const encoding = ctx?.encoding || {};
		
		const rows = bindings.map((binding) => {
			const row = {};
			for (const varName of vars) {
				row[varName] = bindingToValue(binding[varName]);
			}
			return row;
		});
		
		const chart = this._buildCanonicalScatterPlot(rows, encoding);
		
		return {
			chart,
			meta: {
				vars,
				encodingUsed: JSON.parse(JSON.stringify(encoding))
			}
		};
	}
	
	_buildCanonicalScatterPlot(rows, encoding) {
		
		const points = this._normalizePoints({
			rows,
			xField: encoding?.x?.field,
			yField: encoding?.y?.field
		});
		
		return {
			rows,
			points,
		};
	}
	
	_normalizePoints({ rows, xField, yField }) {
		return (rows || [])
		.map((datum, index) => {
			const x = Number(datum?.[xField]);
			const y = Number(datum?.[yField]);
			
			return {
				x,
				y,
				datum,
				index
			};
		})
		.filter((point) => Number.isFinite(point.x))
		.filter((point) => Number.isFinite(point.y));
	}
}