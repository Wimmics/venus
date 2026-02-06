import { createLogger } from "@wimmics/kgnovis-core";

const defaultLogger = createLogger("CooccurrenceGraph", { debug: false });

/**
 * Calcule la co-occurrence basée sur les valeurs partagées de la variable de lien spécifiée.
 * Crée des liens entre entités qui partagent les mêmes valeurs dans la variable de lien spécifiée.
 *
 * Logging: uses our logger module (no this._log*).
 *
 * @param {Array} bindings - Les bindings collectés avec sourceId, binding et vars
 * @param {string} sourceVar - La variable principale utilisée pour les nœuds
 * @param {string} linkVar - La variable spécifiée pour les liens (semanticVar)
 * @returns {Array} Les liens de co-occurrence calculés
 */
export function calculateFlexibleCooccurrence(bindings, sourceVar, linkVar, logger=defaultLogger) {
  // default no-op logger (keeps behavior, avoids crashes)

  logger.debug("Calculating co-occurrence based on specified link variable...");
  logger.debug(`${bindings.length} bindings to analyze`);
  logger.debug(`Source variable: "${sourceVar}"`);
  logger.debug(`Specified link variable: "${linkVar}"`);

  if (!linkVar) {
    logger.warn("No link variable specified");
    return [];
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
          entities: new Set(),
          variable: linkVar
        });
      }

      valueGroups.get(linkValue).entities.add(sourceId);
    }
  });

  logger.debug(`${valueGroups.size} distinct values found for "${linkVar}"`);

  // Créer des liens pour chaque groupe de valeurs partagées
  for (const [linkValue, group] of valueGroups.entries()) {
    const entities = Array.from(group.entities);

    // Ne créer des liens que si au moins 2 entités partagent cette valeur
    if (entities.length >= 2) {
      logger.debug(`Value "${linkValue}": ${entities.length} entities to connect`);

      // Créer des liens entre toutes les paires d'entités dans ce groupe
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const sourceEntity = entities[i];
          const targetEntity = entities[j];

          if (sourceEntity !== targetEntity) {
            const link = {
              source: sourceEntity,
              target: targetEntity,
              type: "semantic",
              semanticLabel: linkValue,
              relationshipType: linkVar,
              tooltip: `Partagent ${linkVar}: ${linkValue}`,
              cooccurrence: true,
              weight: 1,
              groupSize: entities.length,
              linkVariable: linkVar
            };

            cooccurrenceLinks.push(link);
          }
        }
      }
    } else {
      logger.debug(`Value "${linkValue}": ${entities.length} entity (no link created)`);
    }
  }

  // Optimisation - Fusionner les liens multiples entre les mêmes entités
  const optimizedLinks = _optimizeCooccurrenceLinks(cooccurrenceLinks);

  logger.debug("Co-occurrence completed", {
    rawLinks: cooccurrenceLinks.length,
    optimizedLinks: optimizedLinks.length
  });

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
        type: "semantic",
        cooccurrence: true,
        sharedValues: [],
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
    mergedLink.relationshipTypes.add(link.relationshipType);
    mergedLink.weight += link.weight;
  });

  // Convertir en array et finaliser les propriétés
  return Array.from(linkMap.values()).map((link) => {
    const relationshipTypes = Array.from(link.relationshipTypes);
    const primaryValue = link.sharedValues[0]?.value || "relation";

    return {
      ...link,
      semanticLabel: primaryValue,
      relationshipType: relationshipTypes.join(", "),
      tooltip: `Co-occurrence: ${link.sharedValues.length} valeur(s) partagée(s) (${relationshipTypes.join(", ")})`,
      sharedValuesCount: link.sharedValues.length,
      // Garder les détails pour le tooltip avancé
      sharedValuesDetails: link.sharedValues
    };
  });
}
