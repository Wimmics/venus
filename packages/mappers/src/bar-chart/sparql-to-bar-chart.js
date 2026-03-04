import { SparqlToVisMapper } from "../sparql-to-vis-mapper.js";
import { extractLabel } from "../extract-bindings-info.js";
import { VIS_TYPES } from "@wimmics/venus-core";

function bindingToValue(bindingValue, varName, binding, vars) {
  if (!bindingValue) return null;
  if (bindingValue.type === "uri") {
    return extractLabel(bindingValue, varName, binding, vars);
  }
  return bindingValue.value;
}

export class SparqlToBarChartMapper extends SparqlToVisMapper {
  constructor(options = {}) {
    super({ ...options, visType: VIS_TYPES.VENUS_BARCHART });
  }

  map(results, ctx) {
    this._assertValidResults(results);

    const vars = results.head.vars || [];
    const bindings = results.results.bindings || [];
    const encodingManager = ctx?.encodingManager;

    let mapping = ctx?.encoding;
    let usedAdaptiveEncoding = false;

    if (!mapping && encodingManager?.createAdaptiveEncoding) {
      mapping = encodingManager.createAdaptiveEncoding(vars);
      usedAdaptiveEncoding = true;
    } else if (encodingManager?.deriveEncoding) {
      mapping = encodingManager.deriveEncoding(mapping, vars, results);
    }

    const rows = bindings.map((binding) => {
      const row = {};
      for (const varName of vars) {
        row[varName] = bindingToValue(binding[varName], varName, binding, vars);
      }
      return row;
    });

    return {
      chart: { rows },
      meta: {
        usedAdaptiveEncoding,
        vars,
        encodingUsed: JSON.parse(JSON.stringify(mapping || {}))
      }
    };
  }
}
