import { MARK_TYPES, VIS_TYPES } from "@wimmics/venus-core";
import { SparqlToCartesianMapper } from "./sparql-to-cartesian.js";

export class SparqlToScatterPlotMapper extends SparqlToCartesianMapper {
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_SCATTERPLOT });
	}
	
	_buildCanonicalChart(rows, encoding) {
		const xField = encoding?.x?.field;
		const yField = encoding?.y?.field;
		const tooltipFields = this._getTooltipFields(encoding, MARK_TYPES.POINTS);
		
		const points = rows.map((datum, index) => ({
			x: this._toNumber(datum?.[xField]),
			y: this._toNumber(datum?.[yField]),
			datum,
			tooltipData: this._extractOriginalData(datum, tooltipFields),
			index
		}))
		.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
		
		return { rows, points, xField, yField };
	}
}