
/**
* Extrait un identifiant d'un binding SPARQL
*/
export function extractId(binding) {
    if (!binding) return "unknown";
    // Si la valeur liée est un littéral, sa "valeur" est son identifiant pour l'affichage si aucun autre label n'est trouvé.
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


/**
 * TODO: Verify whether this is a good idea, it may false the data.
 * Try to pick the most relevant human-readable label for an entity from a SPARQL binding row.
 *
 * Strategy (in order):
 * 1) If the entity value itself is a literal -> use it.
 * 2) If the entity is a URI -> look for conventional label columns (e.g., geneLabel, geneName, ...).
 * 3) Otherwise -> scan other literal columns and pick the "best" one using keyword scoring.
 * 4) Fallback -> extracted identifier (e.g., last URI segment).
 *
 * @param {object} entityBindingValue - The binding object for the entity (e.g., binding[sourceVar]).
 * @param {string} entityVarName - The SPARQL variable name for the entity (e.g., "gene", "proteinOrtholog").
 * @param {object} currentBinding - The full binding row (one SPARQL result line).
 * @param {string[]} allVars - All variables returned by the SPARQL query.
 * @returns {string} A label to display for the node.
 */
export function extractLabel(entityBindingValue, entityVarName, currentBinding, allVars) {
  const defaultId = extractId(entityBindingValue);

  if (!entityBindingValue) return defaultId;

  // Priority 1: the entity value is already a literal label
  if (entityBindingValue.type === "literal") {
    return entityBindingValue.value;
  }

  // If the entity is a URI, attempt to find a label in related columns
  if (entityBindingValue.type === "uri") {
    // Priority 2: conventional direct label columns derived from the entity variable name
    const directLabelSuffixes = [
      "Label",
      "Name",
      "Title",
      "Term",
      "Identifier",
      "Id",
      "Description"
    ];

    for (const suffix of directLabelSuffixes) {
      const key1 = entityVarName + suffix;
      if (currentBinding[key1] && currentBinding[key1].type === "literal") {
        return currentBinding[key1].value;
      }

      // Also try a variant with the suffix starting lowercase (covers inconsistent naming)
      const key2 = entityVarName + suffix.charAt(0).toLowerCase() + suffix.slice(1);
      if (currentBinding[key2] && currentBinding[key2].type === "literal") {
        return currentBinding[key2].value;
      }
    }

    // Priority 3: pick the best descriptive literal from other columns (scored by variable name keywords)
    let bestOtherLabel = null;
    let bestOtherLabelScore = -1;

    const descriptiveKeywords = {
      label: 5, name: 5, title: 5, term: 4,              // highly relevant
      description: 3, summary: 3, comment: 3, text: 2,    // medium relevance
      taxon: 2, species: 2, organism: 2,                  // taxonomic context
      disease: 2, condition: 2, syndrome: 2,              // disease context
      gene: 1, protein: 1, ensembl: 1, uniprot: 1,        // common IDs/types
      annotation: 1
    };

    for (const otherVar of allVars) {
      if (otherVar === entityVarName) continue;

      const otherVarBinding = currentBinding[otherVar];
      if (!otherVarBinding || otherVarBinding.type !== "literal" || !otherVarBinding.value) continue;

      const otherVarLower = otherVar.toLowerCase();
      let currentScore = 0;

      for (const keyword in descriptiveKeywords) {
        if (otherVarLower.includes(keyword)) {
          currentScore = Math.max(currentScore, descriptiveKeywords[keyword]);
        }
      }

      // Extra bonus for generic column names
      if (["label", "name", "title"].includes(otherVarLower)) currentScore += 2;

      if (currentScore > bestOtherLabelScore) {
        bestOtherLabelScore = currentScore;
        bestOtherLabel = otherVarBinding.value;
      } else if (
        currentScore === bestOtherLabelScore &&
        bestOtherLabel &&
        otherVarBinding.value.length < bestOtherLabel.length
      ) {
        // Tie-breaker: prefer shorter label (less verbose)
        bestOtherLabel = otherVarBinding.value;
      }
    }

    if (bestOtherLabel) return bestOtherLabel;
  }

  // Priority 4: fallback to extracted identifier
  return defaultId;
}

