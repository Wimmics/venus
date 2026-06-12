import { SparqlToVisMapper } from "../sparql-to-vis-mapper.js";
import { bindingToValue } from "../extract-bindings-info.js";
import { isQuantitativeScaleType, SCALE_TYPES, VIS_TYPES } from "@wimmics/venus-core";

export class SparqlToLineChartMapper extends SparqlToVisMapper {
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_LINECHART });
	}
	map(results, ctx) {
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
		
		const chart = this._buildCanonicalLineChart(rows, encoding);
		
		return {
			chart,
			meta: {
				vars,
				encodingUsed: JSON.parse(JSON.stringify(encoding))
			}
		};
	}
	
	_buildCanonicalLineChart(rows, encoding) {
		const xField = encoding?.x?.field;
		const yField = encoding?.y?.field;
		
		const linesConfig = encoding?.lines || {};
		const seriesField = linesConfig?.field || linesConfig?.group?.field || linesConfig?.color?.field || null;
		
		const xScaleType = encoding?.x?.scale?.type || SCALE_TYPES.LINEAR;
		
		const normalizedRows = this._normalizeRows({
			rows,
			xField,
			yField,
			seriesField
		});
		
		const series = this._buildSeries({
			rows: normalizedRows,
			xScaleType
		});
		
		return {
			rows,
			points: normalizedRows,
			series,
			xValues: this._collectXValues(normalizedRows, xScaleType)
		};
	}
	
	_normalizeRows({ rows, xField, yField, seriesField }) {
		return (rows || [])
		.map((datum, index) => {
			const xRaw = datum?.[xField];
			const yRaw = datum?.[yField];
			const y = Number(yRaw);
			
			return {
				x: xRaw,
				y,
				seriesKey: seriesField
				? String(datum?.[seriesField] ?? "undefined")
				: "__single__",
				datum,
				index
			};
		})
		.filter((row) => row.x !== undefined && row.x !== null)
		.filter((row) => Number.isFinite(row.y));
	}
	
	_buildSeries({ rows, xScaleType = SCALE_TYPES.POINT }) {
		const groups = new Map();
		
		for (const row of rows || []) {
			if (!groups.has(row.seriesKey)) {
				groups.set(row.seriesKey, []);
			}
			
			groups.get(row.seriesKey).push(row);
		}
		
		return Array.from(groups.entries()).map(([key, seriesRows]) => ({
			key,
			rows: this._sortSeriesRows(seriesRows, xScaleType)
		}));
	}
	
	
	_sortSeriesRows(rows, scaleType = SCALE_TYPES.POINT) {
		
		return [...(rows || [])].sort((a, b) => {
			if (isQuantitativeScaleType(scaleType)) {
				return Number(a.x) - Number(b.x);
			}
			
			const aNum = Number(a.x);
			const bNum = Number(b.x);
			
			if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
				return aNum - bNum;
			}
			
			return a.index - b.index;
		});
	}
	
	_collectXValues(rows, scaleType = SCALE_TYPES.POINT) {
		
		const values = Array.from(
			new Set(
				(rows || [])
				.map((row) => row.x)
				.filter((value) => value !== undefined && value !== null)
			)
		);
		
		if (isQuantitativeScaleType(scaleType)) {
			return values.map(Number)
				.filter(Number.isFinite)
				.sort((a, b) => a - b);
		}
		
		return values.sort((a, b) => {
			const aNum = Number(a);
			const bNum = Number(b);
			
			if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
				return aNum - bNum;
			}
			
			return 0;
		});
	}
	
}
