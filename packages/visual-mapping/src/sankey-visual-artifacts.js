import { VisualArtifacts } from "./visual-artifacts.js";
import { SORT_BY, SORT_MODE, SORT_ORDER } from "@wimmics/venus-core";

export class SankeyVisualArtifacts extends VisualArtifacts {
	_processChartSpecificArtifacts() {
		const { encoding, data, chart, width, height } = this._payload;
		const nodes = encoding?.nodes || {};
		const links = encoding?.links || {};
		const normalizedFields = this._normalizeNodeFields(nodes.fields);
		const normalizedGlobalSort = this._normalizeSortConfig(nodes.sort, {
			by: SORT_BY.LAYOUT,
			order: SORT_ORDER.ASC,
			mode: null
		});

		this._processStageNodeArtifacts({
			stageFields: normalizedFields,
			nodesData: data?.nodes || []
		});

		const bottomRequirement =
			this.chartSpaceManager.computeLabelRequirement({
				labels: normalizedFields.map((item) => item.title || item.field),
				angle: encoding.nodes.axis?.labelAngle,
				title: encoding.nodes.axis?.title,
				orientation: "bottom"
			});

		const chartSpace = this.chartSpaceManager.computeChartSpace({
			width,
			height,
			userMargin: encoding.margin,
			requirements: {
				bottom: bottomRequirement
			}
		});

		this.layout = {
			...chartSpace,
			align: nodes.align,
			nodeWidth: Number(nodes.size?.value),
			nodePadding: Number(nodes.padding),
			
			columns: this._buildColumns({ fields: normalizedFields, defaultSort: normalizedGlobalSort })
		};
	}

	_normalizeNodeFields(fields = []) {
		if (!Array.isArray(fields)) return [];

		return fields
			.map((item) => {
				if (typeof item === "string") {
					const field = item.trim();
					return field ? { field } : null;
				}

				if (!item || typeof item !== "object") return null;

				const field = typeof item.field === "string" ? item.field.trim() : "";
				if (!field) return null;

				return {
					...item,
					field,
					sort: item.sort,
					title:
						typeof item.title === "string" && item.title.trim()
							? item.title.trim()
							: undefined
				};
			})
			.filter(Boolean);
	}

	_processStageNodeArtifacts({ stageFields = [], nodesData = [] } = {}) {
		for (const [index, stageConfig] of stageFields.entries()) {
			if (!stageConfig?.color) continue;

			this._processMarkArtifacts({
				mark: "nodes",
				role: this._makeStageRole(index),
				config: { color: stageConfig.color },
				data: nodesData.filter((node) => node?.level === index)
			});
		}
	}

	_buildColumns({ fields = [], defaultSort = null }) {
		return fields.map((fieldConfig, index) => ({
			index,
			field: fieldConfig.field,
			title: fieldConfig.title || fieldConfig.field,
			sort: this._normalizeSortConfig(fieldConfig.sort, defaultSort)
		}));
	}

	_normalizeSortConfig(config, fallback = null) {
		if (typeof config === "string") {
			const by = config.trim().toLowerCase();
			return {
				by,
				order: by === SORT_BY.ALPHA ? SORT_ORDER.ASC : SORT_ORDER.DESC,
				mode: by === SORT_BY.COUNT || by === SORT_BY.VALUE ? SORT_MODE.TOTAL : null
			};
		}

		if (!config || typeof config !== "object") {
			return fallback
				? { ...fallback }
				: { by: SORT_BY.LAYOUT, order: SORT_ORDER.ASC, mode: null };
		}

		const by = typeof config.by === "string" && config.by.trim()
			? config.by.trim().toLowerCase()
			: fallback?.by || SORT_BY.LAYOUT;

		const order = typeof config.order === "string" && config.order.trim()
			? config.order.trim().toLowerCase()
			: (by === SORT_BY.ALPHA ? SORT_ORDER.ASC : SORT_ORDER.DESC);

		const mode = typeof config.mode === "string" && config.mode.trim()
			? config.mode.trim().toLowerCase()
			: SORT_MODE.TOTAL;

		return {
			by,
			order: by === SORT_BY.LAYOUT ? SORT_ORDER.ASC : order,
			mode: by === SORT_BY.COUNT || by === SORT_BY.VALUE ? mode : null
		};
	}

	_makeStageRole(level) {
		return `stage-${level}`;
	}
}
