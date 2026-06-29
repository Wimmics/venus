export class ChartSpaceManager {

	computeChartSpace({ width = 800, height = 600, userMargin = {}, requirements = {} }) {

		const margin = this._computeMargins({
			userMargin,
			requirements
		});

		const { innerWidth, innerHeight } =
			this._computeInnerDimensions({
				width,
				height,
				margin
			});

		return {
			width,
			height,
			margin,
			innerWidth,
			innerHeight
		};
	}

	_computeMargins({userMargin = {}, requirements = {}}) {

		const base = {
			top: 20,
			right: 20,
			bottom: 20,
			left: 20
		};

		const margin = {};

		for (const side of ["top", "right", "bottom", "left"]) {

			const requiredSpace =
				Number(requirements?.[side]?.requiredSpace ?? 0);

			margin[side] =
				userMargin?.[side] ??
				Math.max(base[side], requiredSpace);
		}

		return margin;
	}

	_computeInnerDimensions({width, height, margin}) {

		return {
			innerWidth: Math.max(
				1,
				Number(width) - margin.left - margin.right
			),

			innerHeight: Math.max(
				1,
				Number(height) - margin.top - margin.bottom
			)
		};
	}

	computeLabelRequirement({
		labels = [],
		angle = 0,
		offset = { x: 0, y: 0 },
		title = null,
		orientation = "bottom",

		charWidth = 7,
		charHeight = 12,

		basePadding = 20,
		titleSpace = 28
	} = {}) {

		const maxChars = Math.min(
			32,
			Math.max(
				0,
				...(labels || []).map(label =>
					String(label ?? "").length
				)
			)
		);

		const textWidth = maxChars * charWidth;
		const textHeight = charHeight;

		const bounds = this.computeRotatedTextBounds({
			width: textWidth,
			height: textHeight,
			angle
		});

		let requiredSpace = basePadding;

		if (orientation === "bottom") {
			requiredSpace += bounds.height;
			requiredSpace += Math.abs(offset?.y ?? 0);
		}

		if (orientation === "top") {
			requiredSpace += bounds.height;
			requiredSpace += Math.abs(offset?.y ?? 0);
		}

		if (orientation === "left") {
			requiredSpace += bounds.width;
			requiredSpace += Math.abs(offset?.x ?? 0);
		}

		if (orientation === "right") {
			requiredSpace += bounds.width;
			requiredSpace += Math.abs(offset?.x ?? 0);
		}

		if (title) {
			requiredSpace += titleSpace;
		}

		return {
			requiredSpace: Math.ceil(requiredSpace),

			textBounds: bounds,

			labelStats: {
				maxChars,
				textWidth,
				textHeight
			}
		};
	}

	computeTitleRequirement({
		title,
		fontSize = 12,
		padding = 16
	} = {}) {

		if (!title) {
			return {
				requiredSpace: 0
			};
		}

		return {
			requiredSpace: fontSize + padding
		};
	}

	computeRotatedTextBounds({
		width,
		height,
		angle = 0
	} = {}) {

		const radians =
			(Math.abs(angle) * Math.PI) / 180;

		return {
			width:
				Math.abs(width * Math.cos(radians)) +
				Math.abs(height * Math.sin(radians)),

			height:
				Math.abs(width * Math.sin(radians)) +
				Math.abs(height * Math.cos(radians))
		};
	}
}