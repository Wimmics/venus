
/**
* Extrait un identifiant d'un binding SPARQL
*/
export function extractId(binding) {
    if (!binding) return "unknown";
    // Literal values are stable identifiers when they are used directly as fields.
    if (binding.type === 'literal') return binding.value;
    
    const value = binding.value;
    if (!value) return "unknown";
    
    // Gestion spécifique pour les liens OMA gateway.pl
    if (value.includes('gateway.pl') && value.includes('p1=')) {
        try {
            // Essayer d'extraire p1 proprement avec URLSearchParams
            // Il faut une base si l'URL est relative, mais ici on attend des URI complètes.
            const urlObj = new URL(value);
            const params = new URLSearchParams(urlObj.search);
            if (params.has('p1')) {
                return params.get('p1');
            }
        } catch (e) {
            // En cas d'échec du parsing d'URL (ex: URI malformée), tenter une extraction par regex
            const regexMatch = value.match(/p1=([^&]+)/);
            if (regexMatch && regexMatch[1]) {
                return regexMatch[1];
            }
        }
    }
    
    // Extraction générique par split sur / et #
    const parts = value.split(/[/#]/);
    let lastPart = parts.pop(); 
    
    // Si la dernière partie contient encore des paramètres query (ex: ?foo=bar), les enlever.
    if (lastPart && lastPart.includes('?')) {
        lastPart = lastPart.split('?')[0];
    }
    // Si lastPart est vide (ex: URI se terminant par /), essayer de prendre l'avant-dernière partie si elle existe.
    if (!lastPart && parts.length > 0) {
        lastPart = parts.pop();
    }
    
    return lastPart || value; // Retourner la dernière partie, ou la valeur originale en dernier recours.
}


export function bindingToValue(bindingValue) {
  if (!bindingValue || bindingValue.value === undefined || bindingValue.value === null) {
    return null;
  }
  return bindingValue.value;
}

/**
 * Resolve mark label text without guessing from unrelated SPARQL bindings.
 * `labels` accepts `{ value }` or `{ field }`; otherwise use the mark field value.
 */
export function resolveBindingLabel(labelsConfig, fieldBindingValue, currentBinding) {
  const labelValue =
    labelsConfig &&
    typeof labelsConfig === "object" &&
    typeof labelsConfig.value === "string"
      ? labelsConfig.value
      : null;
  if (labelValue !== null) return labelValue;

  const labelField =
    labelsConfig &&
    typeof labelsConfig === "object" &&
    typeof labelsConfig.field === "string" &&
    labelsConfig.field.trim()
      ? labelsConfig.field.trim()
      : null;

  if (labelField) {
    return bindingToValue(currentBinding?.[labelField]) ?? bindingToValue(fieldBindingValue);
  }

  return bindingToValue(fieldBindingValue);
}
