import { SparqlToVisMapper } from "../sparql-to-vis-mapper.js";
import { bindingToValue } from "../extract-bindings-info.js";
import { VIS_TYPES } from "@wimmics/venus-core";

export class SparqlToScatterPlotMapper extends SparqlToVisMapper {
  constructor(options = {}) {
    super({ ...options, visType: VIS_TYPES.VENUS_SCATTERPLOT });
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
        row[varName] = bindingToValue(binding[varName]);
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
