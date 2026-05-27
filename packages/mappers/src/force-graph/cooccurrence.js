import { createLogger } from "@wimmics/venus-core";

const defaultLogger = createLogger("CooccurrenceGraph", { debug: false });

/**
 * Calcule la co-occurrence basée sur les valeurs partagées d'un champ de contexte.
 * Crée des liens entre entités qui partagent les mêmes valeurs de contexte.
 *
 * Logging: uses our logger module (no this._log*).
 *
 * @param {Array} bindings - Les bindings collectés avec sourceId, binding et vars
 * @param {string} sourceVar - La variable principale utilisée pour les nœuds
 * @param {string} linkVar - La variable de contexte spécifiée pour les liens
 * @returns {Array} Les liens de co-occurrence calculés
 */
export function calculateFlexibleCooccurrence(bindings, sourceVar, linkVar) {

  if (!linkVar) {
    throw new Error("No link variable specified");
  }

  const cooccurrenceLinks = [];
  const valueGroups = new Map(); // Groupes d'entités par valeur de la variable de lien

  // Grouper les entités par valeur de la variable de lien SPÉCIFIÉE UNIQUEMENT
  bindings.forEach(({ sourceId, binding }) => {
    if (binding[linkVar] && binding[linkVar].value) {
      const linkValue = binding[linkVar].value;

      if (!valueGroups.has(linkValue)) {
        valueGroups.set(linkValue, {
          value: linkValue,
          entities: new Map(),
          variable: linkVar
        });
      }

      const group = valueGroups.get(linkValue);
      const entityBindings = group.entities.get(sourceId) || [];
      entityBindings.push(binding);
      group.entities.set(sourceId, entityBindings);
    }
  });

  // Créer des liens pour chaque groupe de valeurs partagées
  for (const [linkValue, group] of valueGroups.entries()) {
    const entities = Array.from(group.entities.keys());

    // Ne créer des liens que si au moins 2 entités partagent cette valeur
    if (entities.length >= 2) {

      // Créer des liens entre toutes les paires d'entités dans ce groupe
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const sourceEntity = entities[i];
          const targetEntity = entities[j];

          if (sourceEntity !== targetEntity) {
            const link = {
              source: sourceEntity,
              target: targetEntity,
              type: "cooccurrence",
              semanticLabel: linkValue,
              relationshipType: linkVar,
              tooltip: `Partagent ${linkVar}: ${linkValue}`,
              cooccurrence: true,
              weight: 1,
              groupSize: entities.length,
              linkVariable: linkVar,
              bindingValues: collectBindingValues([
                ...(group.entities.get(sourceEntity) || []),
                ...(group.entities.get(targetEntity) || [])
              ])
            };

            cooccurrenceLinks.push(link);
          }
        }
      }
  
    } else {
      console.warn(`Value "${linkValue}": ${entities.length} entity (no link created)`);
    }
  }

  // Optimisation - Fusionner les liens multiples entre les mêmes entités
  const optimizedLinks = _optimizeCooccurrenceLinks(cooccurrenceLinks);
  return optimizedLinks;
}

/**
 * Optimise les liens de co-occurrence en fusionnant les liens multiples entre les mêmes entités.
 *
 * @param {Array} links - Les liens de co-occurrence bruts
 * @returns {Array} Les liens optimisés
 */
function _optimizeCooccurrenceLinks(links) {
  const linkMap = new Map();

  links.forEach((link) => {
    // Créer une clé unique pour cette paire d'entités (indépendamment de l'ordre)
    const entityPair = [link.source, link.target].sort().join("-");

    if (!linkMap.has(entityPair)) {
      // Premier lien pour cette paire
      linkMap.set(entityPair, {
        source: link.source,
        target: link.target,
        type: "cooccurrence",
        cooccurrence: true,
        sharedValues: [],
        bindingValues: {},
        relationshipTypes: new Set(),
        weight: 0
      });
    }

    const mergedLink = linkMap.get(entityPair);

    // Ajouter les informations de ce lien au lien fusionné
    mergedLink.sharedValues.push({
      value: link.semanticLabel,
      type: link.relationshipType
    });
    mergeBindingValues(mergedLink.bindingValues, link.bindingValues);
    mergedLink.relationshipTypes.add(link.relationshipType);
    mergedLink.weight += link.weight;
  });

  // Convertir en array et finaliser les propriétés
  return Array.from(linkMap.values()).map((link) => {
    const relationshipTypes = Array.from(link.relationshipTypes);
    const primaryValue = link.sharedValues[0]?.value || "relation";
    const {
      bindingValues,
      relationshipTypes: _relationshipTypes,
      ...publicLink
    } = link;

    return {
      ...publicLink,
      ...(relationshipTypes[0] ? { [relationshipTypes[0]]: primaryValue } : {}),
      ...finalizeBindingValues(bindingValues),
      semanticLabel: primaryValue,
      relationshipType: relationshipTypes.join(", "),
      tooltip: `Co-occurrence: ${link.sharedValues.length} valeur(s) partagée(s) (${relationshipTypes.join(", ")})`,
      sharedValuesCount: link.sharedValues.length,
      // Garder les détails pour le tooltip avancé
      sharedValuesDetails: link.sharedValues
    };
  });
}

function collectBindingValues(bindings = []) {
  const valuesByField = {};
  for (const binding of bindings) {
    for (const [fieldName, fieldBinding] of Object.entries(binding || {})) {
      if (fieldBinding?.value === undefined || fieldBinding.value === null) continue;
      if (!valuesByField[fieldName]) valuesByField[fieldName] = new Set();
      valuesByField[fieldName].add(fieldBinding.value);
    }
  }
  return valuesByField;
}

function mergeBindingValues(target = {}, source = {}) {
  for (const [fieldName, values] of Object.entries(source)) {
    if (!target[fieldName]) target[fieldName] = new Set();
    for (const value of values || []) {
      target[fieldName].add(value);
    }
  }
}

function finalizeBindingValues(valuesByField = {}) {
  return Object.fromEntries(
    Object.entries(valuesByField).map(([fieldName, values]) => {
      const uniqueValues = Array.from(values || []);
      return [fieldName, uniqueValues.length === 1 ? uniqueValues[0] : uniqueValues];
    })
  );
}
