import { isQuantitativeScaleType, MARK_TYPES, SCALE_TYPES, VIS_TYPES } from "@wimmics/venus-core";
import { SparqlToCartesianMapper } from "./sparql-to-cartesian.js";

/**
 * Transforms SPARQL results into line chart visualization format.
 * 
 * Extends SparqlToCartesianMapper with line chart-specific logic for handling
 * multi-series lines and points. Transforms SPARQL rows into canonical line chart
 * format with proper x/y field mappings and series grouping.
 * 
 * Output format: { rows: [...], chart: {...} }
 * - rows: Array of data objects with x, y, series, and other encoded fields
 * - chart: Configuration object with series field and other metadata
 * 
 * @extends SparqlToCartesianMapper
 * 
 * @example
 * const mapper = createSparqlMapper(VIS_TYPES.VENUS_LINECHART);
 * const sparqlResults = { head: { vars: ['date', 'sales', 'region'] }, results: {...} };
 * const encoding = { 
 *   x: { field: 'date', scale: { type: 'time' } }, 
 *   y: { field: 'sales' },
 *   lines: { color: { field: 'region' } },
 *   points: { display: true }
 * };
 * const mapped = mapper.map(sparqlResults, { encoding });
 * // Returns { rows: [...], chart: { seriesField: 'region', ... } }
 */
export class SparqlToLineChartMapper extends SparqlToCartesianMapper {
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_LINECHART });
	}


	_buildCanonicalChart(rows, encoding) {
		const xField = encoding?.x?.field;
		const yField = encoding?.y?.field;
		const seriesField = encoding?.lines?.group?.field || encoding?.lines?.color?.field || null;
		const lineLabelsConfig = encoding?.lines?.labels;
		const pointLabelsConfig = encoding?.points?.labels;

		const tooltipFields = this._getTooltipFields(encoding?.points?.tooltip) ?? this._getTooltipFields(encoding?.lines?.tooltip);

		const points = this._getPoints({ rows, xField, yField, seriesField, tooltipFields, pointLabelsConfig });
		const series = this._getSeries({ rows: points, xScaleType: encoding?.x?.scale?.type, lineLabelsConfig, seriesField });

		return { rows, points, series };
	}
	
	
	_getPoints({ rows, xField, yField, seriesField, tooltipFields, pointLabelsConfig }) {

		return (rows || []).map((datum, index) => {
			const xRaw = datum?.[xField];
			const yRaw = datum?.[yField];
			const y = Number(yRaw);
			
			return {
				x: xRaw,
				y,
				seriesKey: seriesField ? String(datum?.[seriesField] ?? "undefined") : "__single__",
				label: this._resolveLabelFromDatum({ labelsConfig: pointLabelsConfig, datum, fallbackField: yField }),
				datum: {...datum, tooltipData: this._createTooltipData(datum, tooltipFields)},
				index
			};
		})
		.filter((row) => row.x !== undefined && row.x !== null)
		.filter((row) => Number.isFinite(row.y));
	}
	
	_getSeries({ rows, xScaleType = SCALE_TYPES.POINT, lineLabelsConfig = null, seriesField = null }) {
		const groups = new Map();
		
		for (const row of rows || []) {
			if (!groups.has(row.seriesKey)) {
				groups.set(row.seriesKey, []);
			}
			
			groups.get(row.seriesKey).push(row);
		}
		
		return Array.from(groups.entries()).map(([key, seriesRows]) => {
			const sortedRows = this._sortSeriesRows(seriesRows, xScaleType);
			const representativeDatum = sortedRows?.[0]?.datum || {};

			return {
				key,
				label: this._resolveLabelFromDatum({ labelsConfig: lineLabelsConfig, datum: representativeDatum, fallbackField: seriesField }) || String(key),
				rows: sortedRows
			};
		});
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
