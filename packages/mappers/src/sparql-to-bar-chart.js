import { bindingToValue } from "./extract-bindings-info.js";
import { VIS_TYPES } from "@wimmics/venus-core";
import { SparqlToCartesianMapper } from "./sparql-to-cartesian.js";

export class SparqlToBarChartMapper extends SparqlToCartesianMapper {
	constructor(options = {}) {
		super({ ...options, visType: VIS_TYPES.VENUS_BARCHART });
	}
	
	_buildCanonicalChart(rows, encoding) {
		const xField = encoding?.x?.field;
		const yField = encoding?.y?.field;

		const colorField = encoding?.bars?.color?.field || null;

		const groupsConfig = encoding?.bars?.groups;
		const stackConfig = encoding?.bars?.stack;

		const shouldAutoGroup =
			stackConfig === false &&
			!groupsConfig &&
			colorField;

		const groupField =
			groupsConfig === true || shouldAutoGroup
				? colorField
				: groupsConfig && typeof groupsConfig === "object"
				? groupsConfig.field || colorField
				: null;

		const stackField =
			stackConfig === true
				? colorField
				: stackConfig && typeof stackConfig === "object"
				? stackConfig.field || colorField || groupField
				: null;

		const stackMode = this._resolveStackMode(encoding?.bars?.stack);
		const layoutMode = this._resolveLayoutMode(stackMode, groupField);

		const splitField =
			layoutMode === "grouped"
				? groupField
				: layoutMode === "stacked" || layoutMode === "normalize"
				? stackField
				: null;

		const normalizedRows = this._normalizeRows({
			rows,
			xField,
			yField,
			splitField
		});

		const xValues = Array.from(new Set(normalizedRows.map((row) => row.x)));

		const subCategories = splitField
			? Array.from(new Set(normalizedRows.map((row) => row.sub)))
			: ["__single__"];

		const tooltipFields = this._getTooltipFields(encoding?.bars?.tooltip);

		const aggregated = this._aggregateByCategory(
			normalizedRows,
			xValues,
			subCategories,
			tooltipFields
		);

		const bars = this._buildBarsForMode({
			mode: layoutMode,
			stackMode,
			xValues,
			subCategories,
			aggregated,
			xField,
			yField,
			splitField
		});

		return {
			rows,
			bars,
			mode: layoutMode,
			stackMode,
			xField,
			yField,
			groupField,
			stackField,
			splitField,
			xValues,
			subCategories
		};
	}

	_buildBarsForMode({
		mode,
		stackMode,
		xValues,
		subCategories,
		aggregated,
		xField,
		yField,
		splitField
		}) {
		if (mode === "stacked" || mode === "normalize") {
			return this._buildStackedBars({
			stackMode,
			xValues,
			subCategories,
			aggregated,
			xField,
			yField,
			splitField
			});
		}

		if (mode === "grouped") {
			return this._buildGroupedBars({
			xValues,
			subCategories,
			aggregated,
			xField,
			yField,
			splitField
			});
		}

		return this._buildSimpleBars({
			xValues,
			aggregated,
			xField,
			yField
		});
	}
	
	_resolveStackMode(stack) {
		if (stack === true) return "stacked";
		if (typeof stack === "string" && stack.toLowerCase().trim() === "normalize") {
			return "normalize";
		}
		return "none";
	}
	
	_resolveLayoutMode(stackMode, groupField) {
		if (stackMode === "stacked" || stackMode === "normalize") return stackMode;
		if (groupField) return "grouped";
		return "simple";
	}
	
	_normalizeRows({ rows, xField, yField, splitField }) {
		return rows.map((datum) => ({
			x: String(datum?.[xField]),
			y: Math.max(0, Number(datum?.[yField]) || 0),
			sub: splitField ? String(datum?.[splitField] ?? "undefined") : "__single__",
			raw: datum
		}));
	}
	
	_aggregateByCategory(rows, xValues, subCategories, tooltipFields = null) {
		const aggregated = new Map();
		
		for (const xCategory of xValues) {
			const subMap = new Map();
			for (const subCategory of subCategories) {
				subMap.set(subCategory, { 
					value: 0, 
					sample: null, 
					values: {},
					tooltipData: {} 
				});
			}
			aggregated.set(xCategory, subMap);
		}
		
		for (const row of rows) {
			const subMap = aggregated.get(row.x);
			if (!subMap) continue;
			
			if (!subMap.has(row.sub)) {
				subMap.set(row.sub, { 
					value: 0, 
					sample: null, 
					values: {},
					tooltipData: {} 
				});
			}
			
			const bucket = subMap.get(row.sub);
			bucket.value += row.y;
			if (!bucket.sample) bucket.sample = row.raw;
			
			this._mergeAggregateValues(bucket.values, row.raw);
			this._mergeTooltipData(bucket.tooltipData, row.raw, tooltipFields)
		}
		
		return aggregated;
	}
	
	_buildSimpleBars({ xValues, aggregated, xField, yField }) {
		return xValues.map((xCategory) => {
			const bucket = aggregated.get(xCategory)?.get("__single__") || { value: 0, sample: null, values: {} };
			
			const value = bucket.value || 0;
			const datum = this._createAggregateDatum(bucket);
			
			datum[xField] = xCategory;
			datum[yField] = value;
			
			return {
				x: xCategory,
				value,
				datum
			};
		});
	}
	
	_buildGroupedBars({ xValues, subCategories, aggregated, xField, yField, splitField }) {
		return xValues.flatMap((xCategory) =>
			subCategories.map((subCategory) => {
				const bucket =
				aggregated.get(xCategory)?.get(subCategory) ||
				{ value: 0, sample: null, values: {} };
				
				const value = bucket.value || 0;
				const datum = this._createAggregateDatum(bucket);
				
				datum[xField] = xCategory;
				datum[yField] = value;
				if (splitField) datum[splitField] = subCategory;
				
				return {
					x: xCategory,
					sub: subCategory,
					value,
					datum,
					observed: Boolean(bucket.sample)
				};
			})
		);
	}

	_buildStackedBars({
		stackMode,
		xValues,
		subCategories,
		aggregated,
		xField,
		yField,
		splitField
	}) {
		const normalized = stackMode === "normalize";
		const bars = [];

		for (const xCategory of xValues) {
			const buckets = subCategories.map((subCategory) => {
			const bucket =
				aggregated.get(xCategory)?.get(subCategory) ||
				{ value: 0, sample: null, values: {} };

			return {
				subCategory,
				bucket,
				rawValue: bucket.value || 0
			};
			});

			const total = buckets.reduce((sum, item) => sum + item.rawValue, 0);

			let y0 = 0;

			for (const item of buckets) {
				const value =
					normalized && total > 0
					? item.rawValue / total
					: item.rawValue;

				const y1 = y0 + value;

				const datum = this._createAggregateDatum(item.bucket);

				datum[xField] = xCategory;
				datum[yField] = item.rawValue;

				if (splitField) {
					datum[splitField] = item.subCategory;
				}

				bars.push({
					x: xCategory,
					sub: item.subCategory,
					value: item.rawValue,
					stackedValue: value,
					y0,
					y1,
					total,
					datum,
					observed: Boolean(item.bucket.sample)
				});

				y0 = y1;
			}
		}

		console.log("stacked bars = ", bars)
		return bars;
	}

	_createAggregateDatum(bucket = {}) {
		const datum = bucket.sample ? { ...bucket.sample } : {};
		
		for (const [fieldName, values] of Object.entries(bucket.values || {})) {
			datum[fieldName] = values.length === 1 ? values[0] : [...values];
		}

		datum.tooltipData = { ...(bucket.tooltipData || {}) }
		
		return datum;
	}

	_mergeAggregateValues(valuesByField, row = {}) {
		for (const [fieldName, value] of Object.entries(row || {})) {
			if (value === undefined || value === null) continue;
			
			if (!Array.isArray(valuesByField[fieldName])) {
				valuesByField[fieldName] = [];
			}
			
			if (!valuesByField[fieldName].includes(value)) {
				valuesByField[fieldName].push(value);
			}
		}
	}
}
