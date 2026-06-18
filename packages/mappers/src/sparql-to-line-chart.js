import { bindingToValue } from "./extract-bindings-info.js";
import { isQuantitativeScaleType, MARK_TYPES, SCALE_TYPES, VIS_TYPES } from "@wimmics/venus-core";
import { SparqlToCartesianMapper } from "./sparql-to-cartesian.js";

export class SparqlToLineChartMapper extends SparqlToCartesianMapper {
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_LINECHART });
	}


	_buildCanonicalChart(rows, encoding) {
		const xField = encoding?.x?.field;
		const yField = encoding?.y?.field;
		const seriesField = encoding?.lines?.group?.field || encoding?.lines?.color?.field || null;

		const tooltipFields = this._getTooltipFields(encoding?.points?.tooltip) ?? this._getTooltipFields(encoding?.lines?.tooltip);

		const points = this._getPoints({ rows, xField, yField, seriesField, tooltipFields }); 
		const series = this._getSeries({ rows: points, xScaleType: encoding?.x?.scale?.type }); 

		return { rows, points, series };
	}
	
	
	_getPoints({ rows, xField, yField, seriesField, tooltipFields }) {

		return (rows || []).map((datum, index) => {
			const xRaw = datum?.[xField];
			const yRaw = datum?.[yField];
			const y = Number(yRaw);
			
			return {
				x: xRaw,
				y,
				seriesKey: seriesField ? String(datum?.[seriesField] ?? "undefined") : "__single__",
				datum: {...datum, tooltipData: this._createTooltipData(datum, tooltipFields)},
				index
			};
		})
		.filter((row) => row.x !== undefined && row.x !== null)
		.filter((row) => Number.isFinite(row.y));
	}
	
	_getSeries({ rows, xScaleType = SCALE_TYPES.POINT }) {
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
