import { VisualArtifacts } from "./visual-artifacts";

export class CartesianVisualArtifacts extends VisualArtifacts {
  build({ encoding, rows = [], marks = [] } = {}) {
    this.reset();

    if (!encoding || typeof encoding !== "object") {
      return this.toObject();
    }

    for (const mark of marks) {
      this._processCartesianMark({
        mark,
        markConfig: encoding?.[mark],
        rows
      });
    }

    return this.toObject();
  }

  _processCartesianMark({ mark, markConfig, rows }) {
    if (!markConfig || typeof markConfig !== "object") return;

    this._processScaleChannel({
      mark,
      channel: "color",
      channelConfig: markConfig.color,
      data: rows,
      isColorScale: true
    });

    this._processScaleChannel({
      mark,
      channel: "size",
      channelConfig: markConfig.size,
      data: rows,
      isColorScale: false
    });

    this._processTooltip({
      mark,
      tooltipConfig: markConfig.tooltip
    });
  }
}