/**
 * Composant Web pour la visualisation de graphes de connaissances.
 * Utilise D3.js pour le rendu SVG et un système d'encoding visuel configurable.
 */
// import * as d3 from 'd3'; // penser a décommenter si l'on veut publier le composant
import { SparqlDataFetcher } from './SparqlDataFetcher.js';
import { DomainCalculator } from './DomainCalculator.js';
import { ColorScaleCalculator, parseD3ColorScheme } from './ColorScaleCalculator.js';

export class VisGraph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.nodes = [];
    this.links = [];
    this.width = 800;
    this.height = 600;
    this.selectedNode = null;
    this.tooltipTimeout = null;
    this.currentEndpoint = null; // Stocker l'endpoint actif
    this.currentProxyUrl = null; // Stocker l'URL du proxy configurée
    this.sparqlData = null; // Stocker les données brutes de la requête SPARQL
    
    // Instance du fetcher pour récupérer les données SPARQL
    this.sparqlFetcher = new SparqlDataFetcher();
    
    // Instance du calculateur de domaines pour l'encoding visuel
    this.domainCalculator = new DomainCalculator();
    
    // Instance du calculateur de palettes de couleurs pour l'encoding visuel
    this.colorScaleCalculator = new ColorScaleCalculator();
    
    // Cache pour les échelles calculées (évite les recalculs multiples)
    this.scaleCache = new Map();
    this.lastEncodingHash = null;
    this.lastDataHash = null;
    
    // Organisation des attributs privés (requête, endpoint, etc.)
    this.internalData = new WeakMap();
    this.internalData.set(this, {}); // Initialisation du stockage interne

    // Logging configuration - set to false to show only warnings and errors
    this.enableDebugLogs = false;

    // Encoding visuel VEGA - configuration par défaut
    this.visualEncoding = this.getDefaultEncoding();
  }

  /**
   * Calcule un hash simple pour détecter les changements d'encoding et de données
   */
  _calculateEncodingHash() {
    return JSON.stringify(this.visualEncoding);
  }

  _calculateDataHash() {
    return `nodes:${this.nodes.length}-links:${this.links.length}`;
  }

  /**
   * Vérifie si le cache des échelles doit être invalidé
   */
  _shouldInvalidateScaleCache() {
    const currentEncodingHash = this._calculateEncodingHash();
    const currentDataHash = this._calculateDataHash();
    
    const shouldInvalidate = 
      this.lastEncodingHash !== currentEncodingHash || 
      this.lastDataHash !== currentDataHash;
    
    if (shouldInvalidate) {
      this._logDebug('Scale cache invalidated - encoding or data changed');
      this.scaleCache.clear();
      this.lastEncodingHash = currentEncodingHash;
      this.lastDataHash = currentDataHash;
    }
    
    return shouldInvalidate;
  }

  /**
   * Récupère ou calcule une échelle avec cache
   */
  _getOrCreateScale(scaleKey, scaleConfig, data, field, isColorScale) {
    // Vérifier si le cache doit être invalidé
    this._shouldInvalidateScaleCache();
    
    // Chercher dans le cache
    if (this.scaleCache.has(scaleKey)) {
      this._logDebug(`Using cached scale: ${scaleKey}`);
      return this.scaleCache.get(scaleKey);
    }
    
    // Créer la nouvelle échelle
    this._logDebug(`Creating new scale: ${scaleKey}`);
    const scale = this.createD3Scale(scaleConfig, data, field, null, isColorScale);
    
    // Mettre en cache
    if (scale) {
      this.scaleCache.set(scaleKey, scale);
    }
    
    return scale;
  }

  /**
   * Centralized logging methods for consistent output
   */
  _logDebug(message, ...args) {
    if (this.enableDebugLogs) {
      console.log(`%c[VisGraph] ${message}`, 'color: #8BC34A', ...args);
    }
  }

  _logInfo(message, ...args) {
    if (this.enableDebugLogs) {
      console.info(`%c[VisGraph] ${message}`, 'color: #2196F3', ...args);
    }
  }

  _logWarn(message, ...args) {
    console.warn(`%c[VisGraph] WARNING: ${message}`, 'color: #FF9800; font-weight: bold', ...args);
  }

  _logError(message, ...args) {
    console.error(`%c[VisGraph] ERROR: ${message}`, 'color: #F44336; font-weight: bold', ...args);
  }

  /**
   * Configuration VEGA par défaut pour l'encoding visuel.
   * Peut être adaptée dynamiquement selon les variables SPARQL disponibles.
   */
  getDefaultEncoding() {
    return {
      "description": "Configuration d'encoding visuel par défaut",
      "width": 800,
      "height": 600,
      "autosize": "none",
      "nodes": {
        "field": ["source"], // array avec minimum 1 valeur
        "color": {
          "field": "type", // Colorer les nœuds par propriété
          "scale": {
            "type": "ordinal",
            "domain": ["uri", "literal"],
            "range": ["#69b3a2", "#ff7f0e"]
          },
          "legend": {
            "display": true,
            "title": "Node Types"
          }
        },
        "size": {
          "field": "links", // Tailler les nœuds par nombre de liens
          "scale": {
            "type": "linear",
            "domain": [0, 10],
            "range": [8, 25] // Rayon en pixels
          },
          "legend": {
            "display": false,
            "title": "Node Size"
          }
        }
      },
      "links": {
        "field": {source: "source", target: "target"}, // Lien directionnel par défaut
        "distance": 100, // Distance par défaut entre les nœuds
        "width": {
          "value": 1.5
        },
        "color": {
          "value": "#999"
        }
      }
    };
  }

  /**
   * Crée un encoding adaptatif basé sur les variables SPARQL disponibles.
   * @param {Array} sparqlVars - Les variables disponibles dans les données SPARQL
   * @returns {Object} Encoding adapté aux données
   */
  createAdaptiveEncoding(sparqlVars) {
    if (!sparqlVars || sparqlVars.length === 0) {
      return this.getDefaultEncoding();
    }

    const defaultEncoding = this.getDefaultEncoding();
    
    // Adapter le field des nœuds à la première variable SPARQL (format array)
    defaultEncoding.nodes.field = [sparqlVars[0]];
    
    // Adapter le field des liens si on a au moins 2 variables
    if (sparqlVars.length > 1) {
      defaultEncoding.links.field = {source: sparqlVars[0], target: sparqlVars[1]};
    } else {
      // Si une seule variable, créer un lien sémantique
      defaultEncoding.links.field = sparqlVars[0];
    }
    
    // S'assurer que les propriétés legend existent pour l'encoding adaptatif
    if (!defaultEncoding.nodes.color.legend) {
      defaultEncoding.nodes.color.legend = {
        display: true,
        title: "Node Types"
      };
    }
    
    if (!defaultEncoding.nodes.size.legend) {
      defaultEncoding.nodes.size.legend = {
        display: false,
        title: "Node Size"
      };
    }
    

    
    this._logDebug(`Adaptive encoding created with SPARQL variables:`, sparqlVars);
    this._logDebug(`-> Nodes based on:`, defaultEncoding.nodes.field);
    this._logDebug(`-> Links based on:`, defaultEncoding.links.field);
    
    return defaultEncoding;
  }

  /**
   * Améliore l'encoding adaptatif avec détection automatique des champs de classification
   * et génération des palettes de couleurs. Appelée après la transformation des données.
   * @param {Array} sparqlVars - Les variables SPARQL disponibles
   * @param {Array} nodeData - Les données des nœuds à analyser
   */
  enhanceAdaptiveEncodingWithClassification(sparqlVars, nodeData = null) {
    const nodes = nodeData || this.nodes;
    if (!nodes || nodes.length === 0 || !sparqlVars) {
      this._logDebug('No data available to enhance adaptive encoding');
      return;
    }

    this._logDebug('Enhancing adaptive encoding with automatic detection...');

    // Détecter le meilleur champ de classification pour les couleurs des nœuds
    const bestClassificationField = this.detectClassificationField(nodes, sparqlVars);
    
    if (bestClassificationField.field !== 'type') {
      this._logDebug(`Replacing color field "type" with "${bestClassificationField.field}"`);
      
      // Mettre à jour l'encoding avec le meilleur champ détecté
      this.visualEncoding.nodes.color.field = bestClassificationField.field;
      
      // Générer automatiquement le domaine et la palette de couleurs
      const fieldValues = this.domainCalculator.getVal(nodes, bestClassificationField.field);
      const sortedDomain = this.domainCalculator.sortDomainValues(fieldValues, 'ordinal');
      const colorPalette = this.colorScaleCalculator.getColorPalette('Set1', sortedDomain.length);
      
      // Mettre à jour l'échelle de couleur
      this.visualEncoding.nodes.color.scale = {
        type: 'ordinal',
        domain: sortedDomain,
        range: colorPalette
      };
      
      // Ajouter les propriétés de légende si elles n'existent pas
      if (!this.visualEncoding.nodes.color.legend) {
        this.visualEncoding.nodes.color.legend = {
          display: true,
          title: `${bestClassificationField.field.charAt(0).toUpperCase() + bestClassificationField.field.slice(1)}`
        };
      }
      
      this._logDebug(`Color encoding updated:`);
      this._logDebug(`-> Field: "${bestClassificationField.field}"`);
      this._logDebug(`-> Domain (${sortedDomain.length} values):`, sortedDomain);
      this._logDebug(`-> Palette:`, colorPalette);
      
      // Émettre un événement pour notifier le changement
      this.dispatchEvent(new CustomEvent('encodingEnhanced', {
        detail: {
          field: bestClassificationField.field,
          reason: bestClassificationField.reason,
          domain: sortedDomain,
          palette: colorPalette,
          timestamp: new Date().toISOString()
        },
        bubbles: true
      }));
    } else {
      this._logDebug('Keeping color field "type" (no better field found)');
    }
  }

  // --- GETTERS ET SETTERS POUR L'API PUBLIQUE ---

  /**
   * Définit la configuration pour l'encoding visuel.
   * Cette méthode déclenche une nouvelle transformation et un nouveau rendu.
   * @param {object} encoding - La configuration d'encoding au format JSON.
   */
  setEncoding(encoding) {
    this._logDebug('New encoding received.');
    
    // Vérifier les problèmes potentiels d'encoding
    if (encoding?.links?.field) {
      this._logDebug('Validating link encoding...');
      
      // Avertissement sur les clés dupliquées
      // this._logWarn('IMPORTANT: If you have defined "field" multiple times in links (ex: field: "goLabel" then field: {source: "x", target: "y"}), JavaScript only keeps the last definition!');
      
      if (typeof encoding.links.field === 'string') {
        this._logDebug('Semantic link detected with field:', encoding.links.field);
      } else if (typeof encoding.links.field === 'object') {
        this._logDebug('Directional link detected with field:', encoding.links.field);
      }
    }
    
    // Si encoding est null, réinitialiser à l'encoding adaptatif ou par défaut
    if (encoding === null) {
      if (this.sparqlData && this.sparqlData.head && this.sparqlData.head.vars) {
        // Créer un encoding adaptatif basé sur les données SPARQL existantes
        this.visualEncoding = this.createAdaptiveEncoding(this.sparqlData.head.vars);
        this._logDebug('Reset to adaptive encoding based on existing SPARQL data');
      } else {
        // Pas de données SPARQL, utiliser l'encoding par défaut
        this.visualEncoding = this.getDefaultEncoding();
        this._logDebug('Reset to default encoding (no SPARQL data)');
      }
    } else {
      // CORRECTION: Validation précoce des champs obligatoires même sans données SPARQL
      if (!encoding.nodes?.field) {
        const errorMessage = 'The "nodes.field" field is required in custom encoding. It must be an array with at least one SPARQL variable.';
        this._logError('Invalid encoding:', errorMessage);
        this.showNotification(errorMessage, 'error');
        this._logWarn('Encoding will be ignored and adaptive encoding will be used instead');
        
        // Utiliser l'encoding adaptatif comme fallback
        if (this.sparqlData && this.sparqlData.head && this.sparqlData.head.vars) {
          this.visualEncoding = this.createAdaptiveEncoding(this.sparqlData.head.vars);
        } else {
          this.visualEncoding = this.getDefaultEncoding();
        }
        return;
      }
      
      // Valider l'encoding par rapport aux données SPARQL disponibles
      if (this.sparqlData && this.sparqlData.head && this.sparqlData.head.vars) {
        const validationResult = this.validateEncoding(encoding, this.sparqlData.head.vars);
        if (!validationResult.isValid) {
          this._logError('Validation failed:', validationResult.warnings);
          // Afficher les erreurs à l'utilisateur
          validationResult.warnings.forEach(warning => {
            this.showNotification(warning, 'error');
          });
          // Arrêter le processus - pas de fallback ni de rendu
          return;
        }
      }
      
      this.visualEncoding = { ...this.getDefaultEncoding(), ...encoding };
    }

    if (this.sparqlData) {
        this._logDebug('Re-transforming and re-rendering with new encoding.');
        try {
          const transformedData = this.transformSparqlResults(this.sparqlData);
          this.nodes = transformedData.nodes;
          this.links = transformedData.links;
          
          // IMPORTANT: Mettre à jour l'encoding avec les domaines calculés automatiquement
          this.updateEncodingWithCalculatedDomains();
          
          this.render();
        } catch (error) {
          this._logError('Error during data transformation:', error.message);
          this.showNotification(error.message, 'error');
          return;
        }
    } else if (this.nodes && this.nodes.length > 0) {
        // Cas où on a déjà des données mais pas de sparqlData (données manuelles)
        this._logDebug('Updating encoding with existing data');
        
        // Mettre à jour l'encoding avec les domaines calculés
        this.updateEncodingWithCalculatedDomains();
        
        this.render();
    } else {
        this._logDebug('No data available to apply new encoding');
    }
  }

  /**
   * Valide un encoding par rapport aux variables SPARQL disponibles.
   * @param {Object} encoding - L'encoding à valider
   * @param {Array} sparqlVars - Les variables SPARQL disponibles
   * @returns {Object} Résultat de validation avec isValid et warnings
   */
  validateEncoding(encoding, sparqlVars) {
    const warnings = [];
    let isValid = true;

    // CORRECTION: Vérifier d'abord que nodes.field est présent (obligatoire)
    if (!encoding.nodes?.field) {
      this._logError('Field "nodes.field" is required in custom encoding');
      warnings.push('The "nodes.field" field is required in custom encoding. It must be an array with at least one SPARQL variable.');
      isValid = false;
    } else {
      // Valider le field des nœuds (doit être un array avec minimum 1 valeur)
      const nodeField = encoding.nodes.field;
      if (!Array.isArray(nodeField) || nodeField.length === 0) {
        this._logError('Nodes field must be an array with at least one value');
        warnings.push('Nodes field must be an array with at least one value');
        isValid = false;
      } else {
        // Valider chaque champ du tableau
        nodeField.forEach((field, index) => {
          if (field !== "links" && field !== "connections" && field !== "type" && !sparqlVars.includes(field)) {
            warnings.push(`Node field #${index+1} "${field}" does not exist in the data. Available variables: ${sparqlVars.join(', ')}`);
            isValid = false;
          }
        });
      }
    }

    // Valider le field des liens
    if (encoding.links?.field) {
      const linkField = encoding.links.field;
      
      // Cas 1: Lien sémantique (string)
      if (typeof linkField === 'string') {
        if (!sparqlVars.includes(linkField)) {
          warnings.push(`Semantic link field "${linkField}" does not exist in the data. Available variables: ${sparqlVars.join(', ')}`);
          isValid = false;
        }
        
        // Vérifier qu'on a au moins 1 nœud pour les liens sémantiques
        if (encoding.nodes?.field && Array.isArray(encoding.nodes.field)) {
          if (encoding.nodes.field.length < 1) {
            this._logError('For semantic links, at least 1 variable is required in nodes field');
            warnings.push('For semantic links, at least 1 variable is required in nodes field');
            isValid = false;
          } else if (encoding.nodes.field.length === 1) {
            this._logDebug('Semantic links with single variable - using automatic co-occurrence');
            // Dans ce cas, on calculera automatiquement la cooccurrence dans transformSparqlResults
          }
        } else {
          this._logError('For semantic links, nodes field must be an array with at least 1 variable');
                      warnings.push('For semantic links, nodes field must be an array with at least 1 variable');
          isValid = false;
        }
      }
      // Cas 2: Lien directionnel (objet {source, target})
      else if (typeof linkField === 'object' && linkField !== null) {
        if (!linkField.source || !linkField.target) {
          this._logError('Directional links field must have "source" and "target" properties');
          warnings.push('Directional links field must have "source" and "target" properties');
          isValid = false;
        } else {
          if (!sparqlVars.includes(linkField.source)) {
            warnings.push(`Source variable "${linkField.source}" does not exist in the data. Available variables: ${sparqlVars.join(', ')}`);
            isValid = false;
          }
          if (!sparqlVars.includes(linkField.target)) {
            warnings.push(`Target variable "${linkField.target}" does not exist in the data. Available variables: ${sparqlVars.join(', ')}`);
            isValid = false;
          }
        }
      } else {
        this._logError('Links field must be either a string (semantic link) or an object {source, target} (directional link)');
        warnings.push('Links field must be either a string or an object {source, target}');
        isValid = false;
      }
    }

    // Valider les fields dans les configurations de couleur et taille
    if (encoding.nodes?.color?.field) {
      const colorField = encoding.nodes.color.field;
      if (colorField !== "type" && colorField !== "links" && colorField !== "connections" && !sparqlVars.includes(colorField)) {
        warnings.push(`Color field "${colorField}" does not exist in the data. Available variables: ${sparqlVars.join(', ')}`);
      }
    }

    if (encoding.nodes?.size?.field) {
      const sizeField = encoding.nodes.size.field;
      if (sizeField !== "links" && sizeField !== "connections" && !sparqlVars.includes(sizeField)) {
        warnings.push(`Size field "${sizeField}" does not exist in the data. Available variables: ${sparqlVars.join(', ')}`);
      }
    }

    return { isValid, warnings };
  }

  /**
   * Met à jour l'encoding visuel interne avec les domaines calculés automatiquement.
   * Cette méthode modifie directement this.visualEncoding.
   */
  updateEncodingWithCalculatedDomains() {
    if (!this.nodes || this.nodes.length === 0) {
      this._logWarn('No data available to calculate domains');
      return;
    }

    this._logDebug('Updating domains in internal encoding...');
    this._logDebug('Debug - current encoding:', this.visualEncoding);

    // --- DOMAINES DES NŒUDS ---
    
    // Domaine pour la couleur des nœuds
    this._logDebug('Debug color - Conditions:');
    this._logDebug('  -> nodes.color.field:', this.visualEncoding.nodes?.color?.field);
    this._logDebug('  -> nodes.color.scale:', this.visualEncoding.nodes?.color?.scale);
    
    if (this.visualEncoding.nodes?.color?.field) {
      const colorField = this.visualEncoding.nodes.color.field;
      
      // Si pas de scale défini, en créer un automatiquement
      if (!this.visualEncoding.nodes.color.scale) {
        this._logDebug(`No scale defined for color field "${colorField}", generating automatically`);
        
        // Calculer le domaine automatiquement
        const calculatedDomain = this.domainCalculator.getDomain(this.nodes, colorField, null, 'ordinal');
        
        if (calculatedDomain && calculatedDomain.length > 0) {
          // Générer une palette de couleurs par défaut
          const defaultPalette = this.colorScaleCalculator.getColorPalette('Set1', calculatedDomain.length, 'ordinal');
          
          // Créer la configuration d'échelle automatiquement
          this.visualEncoding.nodes.color.scale = {
            type: 'ordinal',
            domain: calculatedDomain,
            range: defaultPalette
          };
          
          // Ajouter les propriétés de légende par défaut si elles n'existent pas
          if (!this.visualEncoding.nodes.color.legend) {
            this.visualEncoding.nodes.color.legend = {
              display: true,
              title: colorField.charAt(0).toUpperCase() + colorField.slice(1)
            };
          }
          
          this._logWarn(`Scale automatically generated for color field "${colorField}" (${calculatedDomain.length} unique values): [${calculatedDomain.join(', ')}]. Colors: ${defaultPalette.length} from 'Set1' palette.`);
          this._logDebug(`Generated color scale:`, this.visualEncoding.nodes.color.scale);
        } else {
          this._logWarn(`Could not generate scale for color field "${colorField}" - no valid values found`);
        }
      } else {
        // Scale existe déjà, juste calculer le domaine
        const userDomain = this.visualEncoding.nodes.color.scale.domain;
        const scaleType = this.visualEncoding.nodes.color.scale.type || 'ordinal';
        
        this._logDebug(`Calculating color domain for field "${colorField}" with user domain:`, userDomain);
        
        this.visualEncoding.nodes.color.scale.domain = this.domainCalculator.getDomain(
          this.nodes, 
          colorField, 
          userDomain, 
          scaleType
        );
        
        this._logDebug(`Nodes color domain updated:`, this.visualEncoding.nodes.color.scale.domain);
      }
    } else {
      this._logDebug('No color field specified');
    }
    
    // Domaine pour la taille des nœuds
    if (this.visualEncoding.nodes?.size?.field) {
      const sizeField = this.visualEncoding.nodes.size.field;
      
      // Si pas de scale défini, en créer un automatiquement
      if (!this.visualEncoding.nodes.size.scale) {
        this._logDebug(`No scale defined for size field "${sizeField}", generating automatically`);
        
        // Calculer le domaine automatiquement (pour la taille, utiliser linear par défaut)
        const calculatedDomain = this.domainCalculator.getDomain(this.nodes, sizeField, null, 'linear');
        
        if (calculatedDomain && calculatedDomain.length > 0) {
          // Générer une range de tailles par défaut
          const minSize = 5;
          const maxSize = 20;
          const defaultRange = calculatedDomain.length === 1 ? [minSize] : [minSize, maxSize];
          
          // Créer la configuration d'échelle automatiquement
          this.visualEncoding.nodes.size.scale = {
            type: 'linear',
            domain: calculatedDomain,
            range: defaultRange
          };
          
          // Ajouter les propriétés de légende par défaut si elles n'existent pas
          if (!this.visualEncoding.nodes.size.legend) {
            this.visualEncoding.nodes.size.legend = {
              display: false,  // Par défaut, ne pas afficher la légende de taille
              title: sizeField.charAt(0).toUpperCase() + sizeField.slice(1)
            };
          }
          
          this._logWarn(`Scale automatically generated for size field "${sizeField}" (${calculatedDomain.length} unique values): [${calculatedDomain.join(', ')}]. Size range: [${defaultRange.join(', ')}].`);
          this._logDebug(`Generated size scale:`, this.visualEncoding.nodes.size.scale);
        } else {
          this._logWarn(`Could not generate scale for size field "${sizeField}" - no valid values found`);
        }
      } else {
        // Scale existe déjà, juste calculer le domaine
        const userDomain = this.visualEncoding.nodes.size.scale.domain;
        const scaleType = this.visualEncoding.nodes.size.scale.type || 'linear';
        
        this.visualEncoding.nodes.size.scale.domain = this.domainCalculator.getDomain(
          this.nodes, 
          sizeField, 
          userDomain, 
          scaleType
        );
        
        this._logDebug(`Nodes size domain updated:`, this.visualEncoding.nodes.size.scale.domain);
      }
    }



    this._logDebug('Internal encoding updated with calculated domains');
    
    // Émettre un événement personnalisé pour notifier que les domaines ont été mis à jour
    this.dispatchEvent(new CustomEvent('domainsCalculated', {
      detail: {
        encoding: this.getEncoding(),
        timestamp: new Date().toISOString()
      },
      bubbles: true
    }));
  }

  /**
   * Retourne l'encoding visuel avec les domaines calculés automatiquement.
   * Les domaines sont maintenus à jour automatiquement dans this.visualEncoding.
   * @returns {Object} L'encoding avec domaines à jour
   */
  getEncoding() {
    // Créer une copie de l'encoding pour éviter de modifier l'original
    const encodingCopy = JSON.parse(JSON.stringify(this.visualEncoding));
    
    // Afficher les métadonnées en console uniquement
    const metadata = {
      domainsUpdated: true,
      lastUpdate: new Date().toISOString(),
      dataStats: {
        nodeCount: this.nodes ? this.nodes.length : 0,
        linkCount: this.links ? this.links.length : 0
      }
    };

    this._logDebug('Encoding with updated domains returned');
    this._logDebug('Metadata:', metadata);
    
    return encodingCopy; // Sans les métadonnées
  }

  set sparqlQuery(query) {
    const data = this.internalData.get(this) || {};
    data.sparqlQuery = query;
    this.internalData.set(this, data);
  }
  
  get sparqlQuery() {
    return this.internalData.get(this)?.sparqlQuery;
  }

  set sparqlEndpoint(endpoint) {
    const data = this.internalData.get(this) || {};
    data.sparqlEndpoint = endpoint;
    this.internalData.set(this, data);
  }
  
  get sparqlEndpoint() {
    return this.internalData.get(this)?.sparqlEndpoint;
  }

  set sparqlResult(jsonData) {
    const data = this.internalData.get(this) || {};
    data.sparqlResult = jsonData;
    this.internalData.set(this, data);
  }

  get sparqlResult() {
    return this.internalData.get(this)?.sparqlResult;
  }

  set encoding(mapping) {
    const data = this.internalData.get(this) || {};
    data.encoding = mapping;
    this.internalData.set(this, data);
    this.setEncoding(mapping);
  }

  get encoding() {
    return this.internalData.get(this)?.encoding;
  }

  set proxy(url) {
    const data = this.internalData.get(this) || {};
    data.proxy = url;
    this.internalData.set(this, data);
  }

  get proxy() {
    return this.internalData.get(this)?.proxy;
  }

  /**
   * Lance la récupération des données, leur transformation et le rendu du graphe.
   * Cette méthode est le point d'entrée principal et fonctionne sans paramètres.
   */
  async launch() {
    this._logDebug('Starting visualization process...');

    try {
      // 1. Appliquer l'encoding visuel personnalisé si défini
      if (this.encoding && this.encoding !== this.getDefaultEncoding()) {
        this._logDebug('-> Applying custom visual encoding');
        this.setEncoding(this.encoding);
      }

      // 2. Priorité 1: Utiliser sparqlResult (données JSON pré-formatées)
      if (this.sparqlResult) {
        this._logDebug('-> Priority 1: Processing JSON data (sparqlResult)');
        return await this.setSparqlResult(this.sparqlResult);
      }

      // 3. Priorité 2: Exécuter une requête SPARQL
      if (this.sparqlEndpoint && this.sparqlQuery) {
        this._logDebug('-> Priority 2: Executing SPARQL query');
        return await this.executeSparqlQuery();
      }

      // 4. Priorité 3: Utiliser les données manuelles si elles existent
      if (this.nodes && this.nodes.length > 0) {
        this._logDebug('-> Priority 3: Rendering existing manual data');
        this.render();
        return { status: 'success', message: 'Manual data rendered.' };
      }

      // Si aucune source de données n'est configurée
      const errorMessage = 'No data source configured. Define `sparqlResult`, `sparqlEndpoint`/`sparqlQuery`, or `nodes`/`links` before calling launch().';
      this._logWarn(`${errorMessage}`);
      throw new Error(errorMessage);

    } catch (error) {
      this._logError('Error during launch:', error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Execute SPARQL query using the configured endpoint, query and proxy
   * This is the new simplified method that uses the getters/setters
   */
  async executeSparqlQuery() {// executeSparqlQuery()
    const endpoint = this.sparqlEndpoint;
    const query = this.sparqlQuery;
    const proxyUrl = this.proxy;
    
    if (!endpoint || !query) {
      throw new Error('Veuillez configurer sparqlEndpoint et sparqlQuery avant d\'exécuter la requête');
    }
    
    return await this.loadFromSparqlEndpoint(endpoint, query, null, proxyUrl);
  }

  /**
   * Liste des attributs à observer
   */
  static get observedAttributes() {
    return ['width', 'height'];
  }

  /**
   * Gestion des changements d'attributs
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'width') {
      this.width = parseInt(newValue) || 800;
      this.render();
    } else if (name === 'height') {
      this.height = parseInt(newValue) || 600;
      this.render();
    }
  }

  /**
   * Initialisation quand le composant est ajouté au DOM
   */
  connectedCallback() {
    this.render();
  }

  /**
   * Définit manuellement les données (priorité absolue)
   */
  setData(nodes, links) {
    this._logDebug('Manual data definition');
    this.nodes = nodes;
    this.links = links;
    
    // Vider le cache du calculateur de domaines car les données ont changé
    if (this.domainCalculator) {
      this.domainCalculator.clearCache();
    }
    
    // Vider le cache du calculateur de palettes de couleurs
    if (this.colorScaleCalculator) {
      this.colorScaleCalculator.clearCache();
    }
    
    // Vider le cache des échelles visuelles
    this.scaleCache.clear();
    
    // Mettre à jour l'encoding avec les domaines calculés
    this.updateEncodingWithCalculatedDomains();
    
    this.render();
  }

  /**
   * Charge des données JSON pré-formatées
   */
  setSparqlResult(jsonData) {
    this._logDebug('Loading pre-formatted JSON data');
    return this.loadFromSparqlEndpoint(null, null, jsonData);
  }

  /**
   * Affiche une erreur proxy en créant un panneau dans l'interface
   */
  showProxyErrorPanel() {
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    const errorPanel = document.createElement('div');
    errorPanel.className = 'proxy-error-panel';
    errorPanel.innerHTML = `
      <div class="error-header">
        <h2>🚫 Configuration Proxy Requise</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="error-content">
        <div class="error-message">
          <p><strong>Le composant n'a pas pu accéder directement à l'endpoint SPARQL à cause des restrictions CORS.</strong></p>
          <p>Un proxy local est nécessaire pour contourner ces limitations.</p>
        </div>
        <div class="error-actions">
          <button class="doc-button" onclick="window.open('https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md', '_blank')">
            📖 Guide de configuration du proxy
          </button>
        </div>
      </div>
    `;
    
    // Gestionnaire de fermeture
    errorPanel.querySelector('.close-btn').addEventListener('click', () => {
      errorPanel.remove();
    });
    
    this.shadowRoot.querySelector('.graph-container').appendChild(errorPanel);
  }

  /**
   * Charge les données avec hiérarchie : JSON direct > endpoint > proxy
   * MÉTHODE PUBLIQUE : C'est l'interface principale pour les utilisateurs du composant
   * Le composant délègue la récupération des données au SparqlDataFetcher puis transforme les résultats
   */
  async loadFromSparqlEndpoint(endpoint, query, jsonData = null, proxyUrl = null) {
    try {
      this.currentEndpoint = endpoint;
      this.currentProxyUrl = proxyUrl;
      
      const result = await this.sparqlFetcher.fetchSparqlData(
        endpoint, 
        query, 
        jsonData,
        proxyUrl,
        () => this.showProxyErrorPanel(), // Callback pour afficher le panneau d'erreur proxy
        (message, type) => this.showNotification(message, type) // Callback pour les notifications
      );
      
      if (result.status === 'success') {
        this.sparqlData = result.data; // Conserver les données brutes

        if (result.method === 'direct-json') {
          // Données JSON directes
          try {
            const transformedData = this.transformSparqlResults(result.data);
            this.nodes = transformedData.nodes;
            this.links = transformedData.links;
            
            // Mettre à jour l'encoding avec les domaines calculés
            this.updateEncodingWithCalculatedDomains();
            
            this.render();
            
            return {
              ...result,
              message: `Données chargées depuis JSON: ${this.nodes.length} nœuds, ${this.links.length} liens`,
              data: transformedData
            };
          } catch (error) {
            this._logError('Error during transformation (JSON):', error.message);
            this.showNotification(error.message, 'error');
            return {
              status: 'error',
              message: error.message,
              data: null
            };
          }
        } else {
          // Données depuis endpoint/proxy
          try {
            const transformedData = this.transformSparqlResults(result.data);
            this.nodes = transformedData.nodes;
            this.links = transformedData.links;
            
            // Mettre à jour l'encoding avec les domaines calculés
            this.updateEncodingWithCalculatedDomains();
            
            this.render();
            
            return {
              ...result,
              message: `Données chargées: ${this.nodes.length} nœuds, ${this.links.length} liens`,
              data: transformedData
            };
          } catch (error) {
            this._logError('Error during transformation (SPARQL):', error.message);
            this.showNotification(error.message, 'error');
            return {
              status: 'error',
              message: error.message,
              data: null
            };
          }
        }
      }
      
      return result;
    } catch (error) {
      this._logError('Error while loading data:', error.message);
      return {
        status: 'error',
        message: `Erreur: ${error.message}`,
        data: null,
        rawData: null
      };
    }
  }

  /**
   * Essaie de déterminer le label le plus pertinent pour un nœud à partir d'un binding SPARQL.
   * @param {object} entityBindingValue - L'objet binding pour l'entité (ex: binding[sourceVar]).
   * @param {string} entityVarName - Le nom de la variable SPARQL pour l'entité (ex: "gene", "proteinOrtholog").
   * @param {object} currentBinding - L'ensemble du binding (la ligne de résultat SPARQL).
   * @param {string[]} allVars - Toutes les variables de la requête SPARQL.
   */
  _determineNodeLabelFromBinding(entityBindingValue, entityVarName, currentBinding, allVars) {
    const defaultId = this.extractIdFromBinding(entityBindingValue);

    if (!entityBindingValue) return defaultId;

    // Priorité 1: Valeur littérale de l'entité elle-même.
    if (entityBindingValue.type === 'literal') {
      return entityBindingValue.value;
    }

    // Si c'est une URI, chercher des labels associés.
    if (entityBindingValue.type === 'uri') {
      // Priorité 2: Labels conventionnels directs (ex: geneLabel pour gene).
      const directLabelSuffixes = ['Label', 'Name', 'Title', 'Term', 'Identifier', 'Id', 'Description'];
      for (const suffix of directLabelSuffixes) {
        const directLabelKey = entityVarName + suffix;
        if (currentBinding[directLabelKey] && currentBinding[directLabelKey].type === 'literal') {
          return currentBinding[directLabelKey].value;
        }
        // Essayer aussi avec la première lettre en minuscule pour le suffixe (ex: entityVarName + 'label')
        const directLabelKeyLowerSuffix = entityVarName + suffix.charAt(0).toLowerCase() + suffix.slice(1);
        if (currentBinding[directLabelKeyLowerSuffix] && currentBinding[directLabelKeyLowerSuffix].type === 'literal') {
          return currentBinding[directLabelKeyLowerSuffix].value;
        }
      }
      
      // Priorité 3: Labels descriptifs d'autres colonnes.
      let bestOtherLabel = null;
      let bestOtherLabelScore = -1;

      const descriptiveKeywords = {
        label: 5, name: 5, title: 5, term: 4, // Forte pertinence
        description: 3, summary: 3, comment: 3, text: 2, // Pertinence moyenne
        taxon: 2, species: 2, organism: 2, // Contexte taxonomique
        disease: 2, condition: 2, syndrome: 2, // Contexte maladie
        gene: 1, protein: 1, ensembl: 1, uniprot: 1, // Identifiants/types communs
        annotation: 1
      };

      for (const otherVar of allVars) {
        if (otherVar === entityVarName) continue; // Ne pas se considérer soi-même

        const otherVarBinding = currentBinding[otherVar];
        if (otherVarBinding && otherVarBinding.type === 'literal' && otherVarBinding.value) {
          const otherVarLower = otherVar.toLowerCase();
          let currentScore = 0;

          for (const keyword in descriptiveKeywords) {
            if (otherVarLower.includes(keyword)) {
              currentScore = Math.max(currentScore, descriptiveKeywords[keyword]);
            }
          }
          
          // Bonus si la variable est simplement "label", "name", "title"
          if (['label', 'name', 'title'].includes(otherVarLower)) currentScore += 2;

          if (currentScore > bestOtherLabelScore) {
            bestOtherLabelScore = currentScore;
            bestOtherLabel = otherVarBinding.value;
          } else if (currentScore === bestOtherLabelScore && bestOtherLabel && otherVarBinding.value.length < bestOtherLabel.length) {
            // En cas d'égalité de score, préférer le label le plus court (moins verbeux)
            bestOtherLabel = otherVarBinding.value;
          }
        }
      }

      if (bestOtherLabel) {
        return bestOtherLabel;
      }
    }

    // Priorité 4: Identifiant extrait.
    return defaultId;
  }
  
  /**
   * Transforme les résultats SPARQL en format compatible avec le graphe
   */
  transformSparqlResults(results) {
    if (!results.results || !results.results.bindings || results.results.bindings.length === 0) {
      this._logWarn("SPARQL results are empty or invalid");
      return { nodes: [], links: [] };
    }
    
    // CORRECTION: Nettoyer les données temporaires d'une transformation précédente
    this.cooccurrenceBindings = null;
    
    const nodesMap = new Map();
    const linksMap = new Map();
    
    const vars = results.head.vars;
    this._logDebug("Available SPARQL variables:", vars);
    
    // Si aucun encoding personnalisé n'a été défini, utiliser l'encoding adaptatif
    let mapping = this.visualEncoding;
    const isDefaultEncoding = !this.encoding || 
      (this.encoding === this.getDefaultEncoding()) ||
      (this.visualEncoding.nodes.field === "source" && this.visualEncoding.links.field === "source-target");
    
    let usingAdaptiveEncoding = false;
    if (isDefaultEncoding) {
      mapping = this.createAdaptiveEncoding(vars);
      this.visualEncoding = mapping; // Mettre à jour l'encoding courant
      usingAdaptiveEncoding = true;
      this._logDebug("Using adaptive encoding");
    } else {
      this._logDebug("Using custom encoding");
    }

    // --- FIELD MAPPING ---
    // Résoudre les champs de mapping selon les variables SPARQL disponibles
    const resolvedMapping = this.resolveFieldMapping(mapping, vars);
    
    const sourceVar = resolvedMapping.sourceVar;
    const targetVar = resolvedMapping.targetVar;
    const linkType = resolvedMapping.linkType;
    
    // Pour les liens sémantiques, récupérer la variable sémantique
    const semanticVar = (linkType === 'semantic' && typeof mapping.links.field === 'string') ? mapping.links.field : null;
    
    this._logDebug(`Final mapping - Source: '${sourceVar}', Target: '${targetVar}', Type: '${linkType}'`);
    if (semanticVar) {
      this._logDebug(`Semantic variable: '${semanticVar}'`);
    }

    results.results.bindings.forEach(binding => {
      if (binding[sourceVar]) {
        const sourceId = this.extractIdFromBinding(binding[sourceVar]);
        if (!nodesMap.has(sourceId)) {
          const node = {
            id: sourceId,
            label: this._determineNodeLabelFromBinding(binding[sourceVar], sourceVar, binding, vars),
            uri: binding[sourceVar].type === 'uri' ? binding[sourceVar].value : null,
            type: binding[sourceVar].type, // Default property for coloring
            originalData: {}
          };
          // Attach all data from the binding for potential encoding
          for (const varName of vars) {
            if (binding[varName]) {
              node[varName] = binding[varName].value;
              node.originalData[varName] = binding[varName];
            }
          }
          nodesMap.set(sourceId, node);
        }

        if (linkType === 'directional' && targetVar && binding[targetVar]) {
          const targetId = this.extractIdFromBinding(binding[targetVar]);
          if (!nodesMap.has(targetId)) {
            const node = {
              id: targetId,
              label: this._determineNodeLabelFromBinding(binding[targetVar], targetVar, binding, vars),
              uri: binding[targetVar].type === 'uri' ? binding[targetVar].value : null,
              type: binding[targetVar].type,
              originalData: {}
            };
            for (const varName of vars) {
              if (binding[varName]) {
                node[varName] = binding[varName].value;
                node.originalData[varName] = binding[varName];
              }
            }
            nodesMap.set(targetId, node);
          }

          const linkKey = `${sourceId}-${targetId}`;
          if (!linksMap.has(linkKey)) {
            const link = { 
              source: sourceId, 
              target: targetId,
              type: 'directional'
            };
            // Attach all data to the link as well
            for (const varName of vars) {
              if (binding[varName]) {
                link[varName] = binding[varName].value;
              }
            }
            linksMap.set(linkKey, link);
          }
        } else if (linkType === 'semantic' && targetVar && binding[targetVar]) {
          // Pour les liens sémantiques, créer un lien entre les nœuds avec le label sémantique
          const targetId = this.extractIdFromBinding(binding[targetVar]);
          if (!nodesMap.has(targetId)) {
            const node = {
              id: targetId,
              label: this._determineNodeLabelFromBinding(binding[targetVar], targetVar, binding, vars),
              uri: binding[targetVar].type === 'uri' ? binding[targetVar].value : null,
              type: binding[targetVar].type,
              originalData: {}
            };
            for (const varName of vars) {
              if (binding[varName]) {
                node[varName] = binding[varName].value;
                node.originalData[varName] = binding[varName];
              }
            }
            nodesMap.set(targetId, node);
          }

          const linkKey = `${sourceId}-${targetId}-semantic`;
          if (!linksMap.has(linkKey)) {
            const semanticLabel = (semanticVar && binding[semanticVar]) ? binding[semanticVar].value : 'relation';
            const link = { 
              source: sourceId, 
              target: targetId,
              type: 'semantic',
              semanticLabel: semanticLabel,
              tooltip: semanticLabel
            };
            // Attach all data to the link as well
            for (const varName of vars) {
              if (binding[varName]) {
                link[varName] = binding[varName].value;
              }
            }
            linksMap.set(linkKey, link);
          }
        } else if (linkType === 'semantic' && !targetVar) {
          // Mode cooccurrence flexible : collecter les bindings complets pour analyse
          if (!this.cooccurrenceBindings) {
            this.cooccurrenceBindings = [];
          }
          
          // Stocker le binding complet avec l'ID du nœud source pour analyse flexible
          this.cooccurrenceBindings.push({
            sourceId: sourceId,
            binding: binding,
            vars: vars
          });
        }
      }
    });

    // Traitement de la cooccurrence flexible après avoir collecté toutes les données
    if (linkType === 'semantic' && !targetVar && this.cooccurrenceBindings) {
              this._logDebug('Calculating flexible co-occurrence links...');
      
      const cooccurrenceLinks = this.calculateFlexibleCooccurrence(this.cooccurrenceBindings, sourceVar, semanticVar);
      
      // Ajouter les liens de cooccurrence calculés
      cooccurrenceLinks.forEach(link => {
        const linkKey = `${link.source}-${link.target}-cooccurrence`;
        if (!linksMap.has(linkKey)) {
          linksMap.set(linkKey, link);
        }
      });
      
              this._logDebug(`${cooccurrenceLinks.length} flexible co-occurrence links created`);
      
      // Nettoyer les données temporaires
      this.cooccurrenceBindings = null;
    }

    const finalNodes = Array.from(nodesMap.values());
    const finalLinks = Array.from(linksMap.values());

    // Add link counts to nodes, as this is a common encoding field
    const linkCount = new Map();
    finalNodes.forEach(n => linkCount.set(n.id, 0));
    finalLinks.forEach(l => {
      linkCount.set(l.source, (linkCount.get(l.source) || 0) + 1);
      linkCount.set(l.target, (linkCount.get(l.target) || 0) + 1);
    });
    finalNodes.forEach(n => n.links = linkCount.get(n.id));

    this._logDebug(`Transformation completed: ${finalNodes.length} nodes, ${finalLinks.length} links`);
    
    // Vider le cache du calculateur de domaines car de nouvelles données ont été transformées
    if (this.domainCalculator) {
      this.domainCalculator.clearCache();
    }
    
    // Vider le cache du calculateur de palettes de couleurs
    if (this.colorScaleCalculator) {
      this.colorScaleCalculator.clearCache();
    }
    
    // Vider le cache des échelles visuelles
    this.scaleCache.clear();
    
    // Si on utilise l'encoding adaptatif, améliorer automatiquement avec détection des champs de classification
    if (usingAdaptiveEncoding) {
      try {
        this.enhanceAdaptiveEncodingWithClassification(vars, finalNodes);
      } catch (error) {
        this._logWarn('Error while enhancing adaptive encoding:', error.message);
      }
    }
    
    return {
      nodes: finalNodes,
      links: finalLinks
    };
  }

    /**
   * Calcule la co-occurrence basée sur les valeurs partagées de la variable de lien spécifiée.
   * Crée des liens entre entités qui partagent les mêmes valeurs dans la variable de lien spécifiée.
   * 
   * @param {Array} bindings - Les bindings collectés avec sourceId, binding et vars
   * @param {string} sourceVar - La variable principale utilisée pour les nœuds
   * @param {string} linkVar - La variable spécifiée pour les liens (semanticVar)
   * @returns {Array} Les liens de co-occurrence calculés
   */
  calculateFlexibleCooccurrence(bindings, sourceVar, linkVar) {
    this._logDebug('Calculating co-occurrence based on specified link variable...');
    this._logDebug(`${bindings.length} bindings to analyze`);
    
    this._logDebug(`Source variable: "${sourceVar}"`);
    this._logDebug(`Specified link variable: "${linkVar}"`);
    
    if (!linkVar) {
      this._logWarn(`No link variable specified`);
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
    
    this._logDebug(`${valueGroups.size} distinct values found for "${linkVar}"`);
    
    // Créer des liens pour chaque groupe de valeurs partagées
    for (const [linkValue, group] of valueGroups.entries()) {
      const entities = Array.from(group.entities);
      
      // Ne créer des liens que si au moins 2 entités partagent cette valeur
      if (entities.length >= 2) {
                  this._logDebug(`Value "${linkValue}": ${entities.length} entities to connect`);
        
        // Créer des liens entre toutes les paires d'entités dans ce groupe
        for (let i = 0; i < entities.length; i++) {
          for (let j = i + 1; j < entities.length; j++) {
            const sourceEntity = entities[i];
            const targetEntity = entities[j];
            
            if (sourceEntity !== targetEntity) {
              const link = {
                source: sourceEntity,
                target: targetEntity,
                type: 'semantic',
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
          this._logDebug(`Value "${linkValue}": ${entities.length} entity (no link created)`);
        }
    }
    
    // Optimisation - Fusionner les liens multiples entre les mêmes entités
    const optimizedLinks = this.optimizeCooccurrenceLinks(cooccurrenceLinks);
    
    this._logDebug(`Co-occurrence completed: ${cooccurrenceLinks.length} raw links → ${optimizedLinks.length} optimized links`);
    
    return optimizedLinks;
  }



  /**
   * Optimise les liens de co-occurrence en fusionnant les liens multiples entre les mêmes entités.
   * 
   * @param {Array} links - Les liens de co-occurrence bruts
   * @returns {Array} Les liens optimisés
   */
  optimizeCooccurrenceLinks(links) {
    const linkMap = new Map();
    
    links.forEach(link => {
      // Créer une clé unique pour cette paire d'entités (indépendamment de l'ordre)
      const entityPair = [link.source, link.target].sort().join('-');
      
      if (!linkMap.has(entityPair)) {
        // Premier lien pour cette paire
        linkMap.set(entityPair, {
          source: link.source,
          target: link.target,
          type: 'semantic',
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
    return Array.from(linkMap.values()).map(link => {
      const relationshipTypes = Array.from(link.relationshipTypes);
      const primaryValue = link.sharedValues[0]?.value || 'relation';
      
      return {
        ...link,
        semanticLabel: primaryValue,
        relationshipType: relationshipTypes.join(', '),
        tooltip: `Co-occurrence: ${link.sharedValues.length} valeur(s) partagée(s) (${relationshipTypes.join(', ')})`,
        sharedValuesCount: link.sharedValues.length,
        // Garder les détails pour le tooltip avancé
        sharedValuesDetails: link.sharedValues
      };
    });
  }

  /**
   * Résout le mapping des champs selon les variables SPARQL disponibles.
   * @param {Object} mapping - La configuration d'encoding
   * @param {Array} vars - Les variables SPARQL disponibles
   * @returns {Object} Le mapping résolu avec sourceVar, targetVar et linkType
   */
  resolveFieldMapping(mapping, vars) {
    const linkField = mapping.links?.field;
    let sourceVar = vars[0]; // Par défaut, première variable
    let targetVar = vars.length > 1 ? vars[1] : null; // Par défaut, deuxième variable
    let linkType = 'directional'; // Par défaut directionnel

    // Si un field spécifique est défini pour les nœuds, utiliser le premier
    if (mapping.nodes?.field && Array.isArray(mapping.nodes.field) && mapping.nodes.field.length > 0) {
      sourceVar = mapping.nodes.field[0];
    }

    // Résoudre le mapping des liens
    if (linkField) {
      if (typeof linkField === 'string') {
        // Lien sémantique : une seule variable, mais on a besoin des variables des nœuds
        if (vars.includes(linkField)) {
          linkType = 'semantic';
          // Pour les liens sémantiques, on utilise les variables des nœuds
          if (mapping.nodes?.field && Array.isArray(mapping.nodes.field) && mapping.nodes.field.length >= 2) {
            sourceVar = mapping.nodes.field[0];
            targetVar = mapping.nodes.field[1];
          } else if (mapping.nodes?.field && Array.isArray(mapping.nodes.field) && mapping.nodes.field.length === 1) {
            // Cas spécial : une seule variable de nœud, on calculera la cooccurrence
            sourceVar = mapping.nodes.field[0];
            targetVar = null; // Sera calculé automatiquement par cooccurrence
            this._logDebug(`Co-occurrence mode activated for variable "${sourceVar}"`);
          } else {
            this._logError(`For semantic links, at least 1 variable is required in nodes.field`);
            throw new Error('For semantic links, at least 1 variable is required in nodes.field');
          }
        } else {
          this._logWarn(`Semantic link variable "${linkField}" not found. Available variables:`, vars);
        }
      } else if (typeof linkField === 'object' && linkField !== null) {
        // Lien directionnel : objet {source, target}
        if (linkField.source && linkField.target) {
          if (vars.includes(linkField.source) && vars.includes(linkField.target)) {
            sourceVar = linkField.source;
            targetVar = linkField.target;
            linkType = 'directional';
          } else {
            this._logWarn(`Directional link variables not found. Source: "${linkField.source}", Target: "${linkField.target}". Available variables:`, vars);
          }
        }
      }
    }

    return { sourceVar, targetVar, linkType };
  }
  
  /**
   * Extrait un identifiant d'un binding SPARQL
   */
  extractIdFromBinding(binding) {
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
   * Exécute une requête SPARQL détaillée pour un nœud spécifique avec hiérarchie
   */
  async executeNodeQuery(node) {
    if (!node || !node.uri) {
      this._logError("No URI available for this node");
      this.showNotification("Ce nœud n'a pas d'URI associé", 'error');
      return;
    }
    
    try {
      this._logDebug(`Retrieving details for ${node.label}...`);
      this.showNotification(`Récupération des détails pour ${node.label}...`);
      
      const endpoint = this.currentEndpoint || this.getAttribute('endpoint') || 'https://dbpedia.org/sparql';
      const proxyUrl = this.currentProxyUrl || this.getAttribute('proxy-url'); // Récupérer URL du proxy
      const queries = this.buildInformativeQueries(node.uri);
      
      let allData = {
        descriptive: null,
        technical: null,
        relationships: null
      };
      
      this._logDebug(`Queries for node details ${node.label} (URI: ${node.uri}) on endpoint: ${endpoint}`);
      if (proxyUrl) {
        this._logDebug(`Configured proxy URL: ${proxyUrl}`);
      }

      for (const [queryType, queryContent] of Object.entries(queries)) {
                  this._logDebug(`Executing query type "${queryType}"`);
          this._logDebug(`Query content ${queryType}:\n${queryContent}`);
        try {
          // Utiliser le sparqlFetcher avec hiérarchie endpoint > proxy
          const data = await this.sparqlFetcher.executeSparqlQueryWithFallback(
            endpoint, 
            queryContent,
            proxyUrl,
            () => this.showProxyErrorPanel(),
            (message, type) => this.showNotification(message, type)
          );
          allData[queryType] = data;
                      this._logDebug(`Success for query ${queryType}`);
          } catch (error) {
            this._logWarn(`Error for query ${queryType}:`, error.message);
          this.showNotification(`Erreur lors de la récupération des données de type ${queryType}.`, 'error');
        }
      }
      
      this.displayRichNodeDetails(node, allData);
      return { status: 'success', data: allData };

    } catch (error) {
      this._logError('Major error while retrieving node details:', error.message);
      this.showNotification(`Erreur: ${error.message}`, 'error');
      this.displayBasicNodeDetails(node); // Fallback
      return { status: 'error', message: error.message };
    }
  }
  
  /**
   * Construit des requêtes SPARQL informatives selon le type d'URI
   */
  buildInformativeQueries(uri) {
    const queries = {};
    
    // Requête pour informations descriptives (labels, définitions, commentaires)
    queries.descriptive = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      
      SELECT DISTINCT ?property ?value ?lang
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property = rdfs:label ||
          ?property = rdfs:comment ||
          ?property = skos:prefLabel ||
          ?property = skos:altLabel ||
          ?property = skos:definition ||
          ?property = skos:note ||
          ?property = dc:title ||
          ?property = dcterms:title ||
          ?property = dc:description ||
          ?property = dcterms:description ||
          ?property = foaf:name
        )
        
        BIND(LANG(?value) as ?lang)
      }
      ORDER BY ?property
      LIMIT 100
    `;
    
    // Requête pour relations sémantiques
    queries.relationships = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      
      SELECT DISTINCT ?property ?value ?valueLabel
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property = rdfs:subClassOf ||
          ?property = rdf:type ||
          ?property = skos:broader ||
          ?property = skos:narrower ||
          ?property = skos:related ||
          ?property = owl:sameAs ||
          ?property = owl:equivalentClass ||
          ?property = rdfs:seeAlso ||
          ?property = dcterms:isPartOf ||
          ?property = dcterms:hasPart
        )
        
        OPTIONAL {
          ?value rdfs:label ?valueLabel .
          FILTER(LANG(?valueLabel) = "" || LANGMATCHES(LANG(?valueLabel), "en") || LANGMATCHES(LANG(?valueLabel), "fr"))
        }
        OPTIONAL {
            ?value skos:prefLabel ?prefLabel .
            FILTER(LANG(?prefLabel) = "" || LANGMATCHES(LANG(?prefLabel), "en") || LANGMATCHES(LANG(?prefLabel), "fr"))
        }
        BIND(COALESCE(?valueLabel, ?prefLabel, "") AS ?valueLabel)

      }
      ORDER BY ?property
      LIMIT 50
    `;
    
    // Requête pour propriétés techniques et métadonnées
    queries.technical = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      
      SELECT DISTINCT ?property ?value ?valueType
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property != rdfs:label &&
          ?property != rdfs:comment &&
          ?property != skos:prefLabel &&
          ?property != skos:altLabel &&
          ?property != skos:definition &&
          ?property != skos:note &&
          ?property != dc:title &&
          ?property != dcterms:title &&
          ?property != dc:description &&
          ?property != dcterms:description &&
          ?property != foaf:name &&
          ?property != rdfs:subClassOf &&
          ?property != rdf:type &&
          ?property != skos:broader &&
          ?property != skos:narrower &&
          ?property != skos:related &&
          ?property != owl:sameAs &&
          ?property != owl:equivalentClass &&
          ?property != rdfs:seeAlso &&
          ?property != dcterms:isPartOf &&
          ?property != dcterms:hasPart
        )
        
        BIND(
          IF(isLiteral(?value), "literal",
            IF(isURI(?value), "uri", "unknown")
          ) AS ?valueType
        )
      }
      ORDER BY ?property
      LIMIT 150
    `;
    
    return queries;
  }
  
  /**
   * Affiche les détails riches d'un nœud
   */
  displayRichNodeDetails(node, allData) {
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    const panel = document.createElement('div');
    panel.className = 'node-details-panel';
    
    // En-tête
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const title = document.createElement('h2');
    title.textContent = node.label;
    title.style.margin = '0';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'close-btn';
    closeBtn.addEventListener('click', () => panel.remove());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    
    // Contenu principal
    const content = document.createElement('div');
    content.className = 'panel-content';
    
    // Section informations de base (toujours affichée)
    this.addBasicInfoSection(content, node);
    
    // Section contexte du graphe (à partir des données originales du graphe)
    this.addGraphContextSection(content, node);
    
    // Section informations descriptives complètes
    if (allData.descriptive && allData.descriptive.results && allData.descriptive.results.bindings.length > 0) {
      this.addCompleteDescriptiveSection(content, allData.descriptive.results.bindings);
    }
    
    // Section relations complètes avec détails
    if (allData.relationships && allData.relationships.results && allData.relationships.results.bindings.length > 0) {
      this.addCompleteRelationshipsSection(content, allData.relationships.results.bindings);
    }
    
    // Section propriétés techniques complètes
    if (allData.technical && allData.technical.results && allData.technical.results.bindings.length > 0) {
      this.addCompleteTechnicalSection(content, allData.technical.results.bindings);
    }
    
    // Résumé des données récupérées
    this.addDataSummary(content, allData);
    
    panel.appendChild(content);
    this.shadowRoot.querySelector('.graph-container').appendChild(panel);
  }
  
  /**
   * Ajoute une section d'informations de base
   */
  addBasicInfoSection(container, node) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Basic Information';
    title.style.borderBottom = '2px solid #007cba';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    this.addDetailedInfoRow(section, 'Label', node.label);
    this.addDetailedInfoRow(section, 'URI', node.uri, true);
    this.addDetailedInfoRow(section, 'Accession', this.extractAccessionFromURI(node.uri));
    

    
    const connections = this.links.filter(l => 
      l.source.id === node.id || l.target.id === node.id
    ).length;
    this.addDetailedInfoRow(section, 'Connections in Graph', connections.toString());
    
    container.appendChild(section);
  }
  
  /**
   * Ajoute une section de contexte du graphe basée sur les données originales.
   */
  addGraphContextSection(container, node) {
    if (!node.originalData) return;

    const graphContextInfo = this.extractGraphContext(node);
    if (graphContextInfo.length === 0) return;

    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Graph Context (from original data)';
    title.style.borderBottom = '2px solid #17a2b8';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    graphContextInfo.forEach(info => {
      this.addDetailedInfoRow(section, info.type, info.value, info.isUri);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Extrait le contexte du graphe d'un nœud à partir de ses données originales.
   */
  extractGraphContext(node) {
    const context = [];
    if (!node.originalData || !this.sparqlData || !this.sparqlData.head || !this.sparqlData.head.vars) {
      return context;
    }

    const mainSparqlVars = this.sparqlData.head.vars;
    const sourceVar = mainSparqlVars[0];
    const targetVar = mainSparqlVars.length > 1 ? mainSparqlVars[1] : null;

    // Identifier les variables qui pourraient être des labels déjà utilisés pour le nœud principal
    // (pour éviter de les répéter dans le contexte)
    const potentialLabelVars = mainSparqlVars.filter(v => 
        v.toLowerCase().includes('label') || 
        v.toLowerCase().includes('name') || 
        v.toLowerCase().includes('title')
    );

    for (const [key, valueObj] of Object.entries(node.originalData)) {
      // Exclure les variables principales (source, target) et les variables de label probables
      // ainsi que les "meta-variables" comme type et lang qui sont attachées aux valeurs elles-mêmes.
      if (key !== sourceVar && 
          key !== targetVar && 
          !potentialLabelVars.includes(key) &&
          key !== 'type' && key !== 'lang' && // Clés ajoutées par SPARQL JSON pour le type/lang de la valeur
          valueObj && typeof valueObj.value !== 'undefined') { 
        
        context.push({
          type: this.getReadablePropertyName(key), 
          value: valueObj.value,
          isUri: valueObj.type === 'uri'
        });
      }
    }
    
    return context;
  }
  
  /**
   * Ajoute la section informations descriptives complètes
   */
  addCompleteDescriptiveSection(container, bindings) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = `Descriptive Information (${bindings.length} properties)`;
    title.style.borderBottom = '2px solid #28a745';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    bindings.forEach((binding, index) => {
      const propContainer = document.createElement('div');
      propContainer.style.marginBottom = '15px';
      propContainer.style.padding = '12px';
      propContainer.style.border = '1px solid #dee2e6';
      propContainer.style.borderRadius = '5px';
      propContainer.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      // Nom de la propriété
      const propHeader = document.createElement('div');
      propHeader.style.display = 'flex';
      propHeader.style.justifyContent = 'space-between';
      propHeader.style.alignItems = 'center';
      propHeader.style.marginBottom = '8px';
      
      const propName = document.createElement('strong');
      propName.textContent = this.getReadablePropertyName(binding.property.value);
      propName.style.color = '#495057';
      propName.style.fontSize = '14px';
      propHeader.appendChild(propName);
      
      const propType = document.createElement('span');
      propType.textContent = binding.lang && binding.lang.value ? `[${binding.lang.value}]` : '[text]';
      propType.style.fontSize = '11px';
      propType.style.color = '#6c757d';
      propType.style.backgroundColor = '#e9ecef';
      propType.style.padding = '2px 6px';
      propType.style.borderRadius = '3px';
      propHeader.appendChild(propType);
      
      propContainer.appendChild(propHeader);
      
      // URI de la propriété
      const propUri = document.createElement('div');
      propUri.style.fontSize = '11px';
      propUri.style.color = '#6c757d';
      propUri.style.marginBottom = '8px';
      propUri.style.wordBreak = 'break-all';
      propUri.innerHTML = `Property URI: <a href="${binding.property.value}" target="_blank" style="color: #007cba;">${binding.property.value}</a>`;
      propContainer.appendChild(propUri);
      
      // Valeur
      const valueDiv = document.createElement('div');
      valueDiv.style.color = '#212529';
      valueDiv.style.fontSize = '13px';
      valueDiv.style.lineHeight = '1.5';
      valueDiv.style.padding = '8px';
      valueDiv.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
      valueDiv.style.borderRadius = '3px';
      valueDiv.style.wordBreak = 'break-word';
      valueDiv.textContent = binding.value.value;
      propContainer.appendChild(valueDiv);
      
      section.appendChild(propContainer);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Ajoute la section relations complètes avec détails
   */
  addCompleteRelationshipsSection(container, bindings) {
    // Déduplication des relations basée sur propriété + valeur cible
    const uniqueRelations = new Map();
    bindings.forEach(binding => {
      const key = `${binding.property.value}|${binding.value.value}`;
      if (!uniqueRelations.has(key)) {
        uniqueRelations.set(key, binding);
      }
    });
    const deduplicatedBindings = Array.from(uniqueRelations.values());
    
    this._logDebug(`Relations deduplication: ${bindings.length} → ${deduplicatedBindings.length}`);
    
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = `Relationships & Classifications (${deduplicatedBindings.length} relations)`;
    title.style.borderBottom = '2px solid #ffc107';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    // Expliquer la différence avec les connexions du graphe
    const explanation = document.createElement('div');
    explanation.style.backgroundColor = '#fff3cd';
    explanation.style.border = '1px solid #ffeaa7';
    explanation.style.borderRadius = '4px';
    explanation.style.padding = '8px';
    explanation.style.marginBottom = '15px';
    explanation.style.fontSize = '12px';
    explanation.innerHTML = `
      <strong>ℹ️ Note:</strong> These are <strong>semantic relationships</strong> from ontologies (what this term IS), 
      different from the <strong>graph connections</strong> (which entities are associated with this term in your data).
    `;
    section.appendChild(explanation);
    
    deduplicatedBindings.forEach((binding, index) => {
      const relationContainer = document.createElement('div');
      relationContainer.style.marginBottom = '15px';
      relationContainer.style.padding = '12px';
      relationContainer.style.border = '1px solid #ffc107';
      relationContainer.style.borderRadius = '5px';
      relationContainer.style.backgroundColor = index % 2 === 0 ? '#fff8e1' : '#ffffff';
      
      // Type de relation avec explication
      const relationHeader = document.createElement('div');
      relationHeader.style.display = 'flex';
      relationHeader.style.justifyContent = 'space-between';
      relationHeader.style.alignItems = 'center';
      relationHeader.style.marginBottom = '8px';
      
      const relationType = document.createElement('strong');
      relationType.textContent = this.getReadablePropertyName(binding.property.value);
      relationType.style.color = '#856404';
      relationType.style.fontSize = '14px';
      relationHeader.appendChild(relationType);
      
      const relationBadge = document.createElement('span');
      relationBadge.textContent = '[SEMANTIC]';
      relationBadge.style.fontSize = '10px';
      relationBadge.style.color = '#856404';
      relationBadge.style.backgroundColor = '#ffc107';
      relationBadge.style.padding = '2px 6px';
      relationBadge.style.borderRadius = '3px';
      relationHeader.appendChild(relationBadge);
      
      relationContainer.appendChild(relationHeader);
      
      // URI de la propriété de relation
      const propUri = document.createElement('div');
      propUri.style.fontSize = '11px';
      propUri.style.color = '#6c757d';
      propUri.style.marginBottom = '8px';
      propUri.style.wordBreak = 'break-all';
      propUri.innerHTML = `Relation URI: <a href="${binding.property.value}" target="_blank" style="color: #007cba;">${binding.property.value}</a>`;
      relationContainer.appendChild(propUri);
      
      // Entité liée
      const targetContainer = document.createElement('div');
      targetContainer.style.padding = '10px';
      targetContainer.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
      targetContainer.style.borderRadius = '4px';
      targetContainer.style.border = '1px solid rgba(255, 193, 7, 0.3)';
      
      // Label de l'entité liée (si disponible)
      if (binding.valueLabel && binding.valueLabel.value) {
        const targetLabel = document.createElement('div');
        targetLabel.style.fontWeight = 'bold';
        targetLabel.style.color = '#212529';
        targetLabel.style.fontSize = '14px';
        targetLabel.style.marginBottom = '6px';
        targetLabel.textContent = `➤ ${binding.valueLabel.value}`;
        targetContainer.appendChild(targetLabel);
        
        const ontologySourceText = this.getSimpleOntologySource(binding.value.value);
        if (ontologySourceText) {
          const sourceDiv = document.createElement('div');
          sourceDiv.style.fontSize = '11px';
          sourceDiv.style.color = '#6c757d';
          sourceDiv.style.marginBottom = '6px';
          sourceDiv.innerHTML = `📚 <strong>Source:</strong> ${ontologySourceText}`;
          targetContainer.appendChild(sourceDiv);
        }
      }
      
      // URI de l'entité liée
      const targetUri = document.createElement('div');
      targetUri.style.fontSize = '11px';
      targetUri.style.color = '#495057';
      targetUri.style.wordBreak = 'break-all';
      targetUri.innerHTML = `🔗 Target URI: <a href="${binding.value.value}" target="_blank" style="color: #007cba;">${binding.value.value}</a>`;
      targetContainer.appendChild(targetUri);
      
      relationContainer.appendChild(targetContainer);
      section.appendChild(relationContainer);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Extrait une information de source simplifiée depuis une URI (domaine ou préfixe connu).
   */
  getSimpleOntologySource(uri) {
    if (!uri || typeof uri !== 'string') return 'Unknown Source';

    // Priorité aux préfixes bien connus pour les ontologies courantes
    const knownPrefixes = {
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'RDF',
      'http://www.w3.org/2000/01/rdf-schema#': 'RDFS',
      'http://www.w3.org/2002/07/owl#': 'OWL',
      'http://www.w3.org/2004/02/skos/core#': 'SKOS',
      'http://purl.org/dc/elements/1.1/': 'DC',
      'http://purl.org/dc/terms/': 'DCTERMS',
      'http://xmlns.com/foaf/0.1/': 'FOAF',
      'http://purl.obolibrary.org/obo/GO_': 'GO (OBO)',       // Gene Ontology
      'http://purl.obolibrary.org/obo/DOID_': 'DOID (OBO)',   // Human Disease Ontology
      'http://purl.obolibrary.org/obo/CHEBI_': 'ChEBI (OBO)', // Chemical Entities of Biological Interest
      'http://purl.obolibrary.org/obo/CL_': 'CL (OBO)',       // Cell Ontology
      'http://purl.obolibrary.org/obo/PR_': 'PRO (OBO)',      // Protein Ontology
      'http://purl.obolibrary.org/obo/UBERON_': 'Uberon (OBO)', // Uber-anatomy ontology
      'http://purl.obolibrary.org/obo/SO_': 'SO (OBO)',       // Sequence Ontology
      'http://purl.obolibrary.org/obo/NCBITaxon_': 'NCBI Taxonomy (OBO)',
      'http://purl.obolibrary.org/obo/RO_': 'RO (OBO)', // Relations Ontology
      'http://purl.obolibrary.org/obo/BFO_': 'BFO (OBO)', // Basic Formal Ontology
      'http://purl.uniprot.org/core/': 'UniProt Core',
      'http://rdf.ebi.ac.uk/terms/ensembl/' : 'Ensembl (EBI)',
      'http://www.ebi.ac.uk/ols/ontologies/': 'OLS (EBI)'
    };

    for (const prefix in knownPrefixes) {
      if (uri.startsWith(prefix)) {
        return knownPrefixes[prefix];
      }
    }

    // Si aucun préfixe connu, essayer d'extraire le nom de domaine
    try {
      const url = new URL(uri);
      // Cas spécifique pour purl.obolibrary.org si non capturé par préfixe direct
      if (url.hostname === 'purl.obolibrary.org' && url.pathname.startsWith('/obo/')) {
        const pathParts = url.pathname.split('/');
        if (pathParts.length > 2 && pathParts[1] === 'obo') {
            const oboTermPart = pathParts[2];
            const oboNamespace = oboTermPart.split('_')[0];
            if (oboNamespace) return `${oboNamespace.toUpperCase()} (OBO Library)`;
        }
        return 'OBO Library';
      }
      return url.hostname; // Retourne le nom de domaine comme source générique
    } catch (error) {
      // En cas d'URI invalide ou relative (peu probable ici car on attend une URI de ?value)
      // Tenter une extraction simple du "namespace" avant le # ou le dernier /
      const hashIndex = uri.lastIndexOf('#');
      if (hashIndex > 0) {
        const potentialNs = uri.substring(0, hashIndex);
        if (potentialNs.length > 5) return potentialNs; // Éviter les "http:"
      }
      const slashIndex = uri.lastIndexOf('/');
      if (slashIndex > 0) {
        const potentialNs = uri.substring(0, slashIndex);
        if (potentialNs.length > 5 && potentialNs.includes(':/')) return potentialNs;
      }
      return 'Unknown Source'; // Fallback final
    }
  }

  /**
   * Ajoute la section propriétés techniques complètes
   */
  addCompleteTechnicalSection(container, bindings) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const titleContainer = document.createElement('div');
    titleContainer.style.cursor = 'pointer';
    titleContainer.style.borderBottom = '2px solid #6c757d';
    titleContainer.style.paddingBottom = '5px';
    titleContainer.style.marginBottom = '15px';
    
    const title = document.createElement('h3');
    title.textContent = `▼ Technical Properties (${bindings.length} properties)`;
    title.style.margin = '0';
    titleContainer.appendChild(title);
    
    const content = document.createElement('div');
    content.className = 'technical-content';
    content.style.display = 'none';
    
    bindings.forEach((binding, index) => {
      const propContainer = document.createElement('div');
      propContainer.style.marginBottom = '12px';
      propContainer.style.padding = '10px';
      propContainer.style.border = '1px solid #dee2e6';
      propContainer.style.borderRadius = '4px';
      propContainer.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      // En-tête de la propriété technique
      const propHeader = document.createElement('div');
      propHeader.style.display = 'flex';
      propHeader.style.justifyContent = 'space-between';
      propHeader.style.alignItems = 'center';
      propHeader.style.marginBottom = '6px';
      
      const propName = document.createElement('strong');
      propName.textContent = binding.property.value.split(/[/#]/).pop();
      propName.style.fontSize = '12px';
      propName.style.color = '#495057';
      propHeader.appendChild(propName);
      
      const valueType = binding.valueType ? binding.valueType.value : 'unknown';
      const typeBadge = document.createElement('span');
      typeBadge.textContent = valueType.toUpperCase();
      typeBadge.style.fontSize = '9px';
      typeBadge.style.color = valueType === 'uri' ? '#007cba' : '#28a745';
      typeBadge.style.backgroundColor = valueType === 'uri' ? '#e3f2fd' : '#e8f5e9';
      typeBadge.style.padding = '2px 4px';
      typeBadge.style.borderRadius = '2px';
      propHeader.appendChild(typeBadge);
      
      propContainer.appendChild(propHeader);
      
      // URI complète de la propriété
      const fullPropUri = document.createElement('div');
      fullPropUri.style.fontSize = '10px';
      fullPropUri.style.color = '#6c757d';
      fullPropUri.style.marginBottom = '6px';
      fullPropUri.style.wordBreak = 'break-all';
      fullPropUri.innerHTML = `<a href="${binding.property.value}" target="_blank" style="color: #6c757d;">${binding.property.value}</a>`;
      propContainer.appendChild(fullPropUri);
      
      // Valeur
      const valueDiv = document.createElement('div');
      valueDiv.style.fontSize = '11px';
      valueDiv.style.padding = '6px';
      valueDiv.style.backgroundColor = '#f8f9fa';
      valueDiv.style.borderRadius = '3px';
      valueDiv.style.wordBreak = 'break-all';
      
      if (valueType === 'uri') {
        valueDiv.innerHTML = `<a href="${binding.value.value}" target="_blank" style="color: #007cba;">${binding.value.value}</a>`;
    } else {
        valueDiv.textContent = binding.value.value;
      }
      
      propContainer.appendChild(valueDiv);
      content.appendChild(propContainer);
    });
    
    // Toggle functionality
    titleContainer.addEventListener('click', () => {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      title.textContent = `${isVisible ? '▶' : '▼'} Technical Properties (${bindings.length} properties)`;
    });
    
    section.appendChild(titleContainer);
    section.appendChild(content);
    container.appendChild(section);
  }
  
  /**
   * Ajoute un résumé des données récupérées
   */
  addDataSummary(container, allData) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginTop = '20px';
    section.style.padding = '10px';
    section.style.backgroundColor = '#e9ecef';
    section.style.borderRadius = '5px';
    
    const title = document.createElement('h4');
    title.textContent = 'Data Retrieval Summary';
    title.style.color = '#495057';
    title.style.marginBottom = '8px';
    section.appendChild(title);
    
    const summary = document.createElement('div');
    summary.style.fontSize = '12px';
    summary.style.color = '#6c757d';
    
    const descriptiveCount = allData.descriptive && allData.descriptive.results ? allData.descriptive.results.bindings.length : 0;
    const relationshipsCount = allData.relationships && allData.relationships.results ? allData.relationships.results.bindings.length : 0;
    const technicalCount = allData.technical && allData.technical.results ? allData.technical.results.bindings.length : 0;
    const totalCount = descriptiveCount + relationshipsCount + technicalCount;
    
    summary.innerHTML = `
      • <strong>${descriptiveCount}</strong> descriptive properties retrieved<br>
      • <strong>${relationshipsCount}</strong> relationships found<br>
      • <strong>${technicalCount}</strong> technical properties collected<br>
      • <strong>${totalCount}</strong> total properties from API<br>
      • Endpoint: <code>${this.currentEndpoint || 'default'}</code>
    `;
    
    section.appendChild(summary);
    container.appendChild(section);
  }
  
  /**
   * Ajoute une ligne d'information détaillée
   */
  addDetailedInfoRow(container, label, value, isLink = false) {
    if (!value || value === 'None' || value === '') return;
    
    const row = document.createElement('div');
    row.style.marginBottom = '10px';
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    
    const labelElement = document.createElement('strong');
    labelElement.textContent = label;
    labelElement.style.color = '#2c3e50';
    labelElement.style.fontSize = '13px';
    labelElement.style.marginBottom = '3px';
    row.appendChild(labelElement);
    
    const valueElement = document.createElement('div');
    valueElement.style.paddingLeft = '12px';
    valueElement.style.color = '#34495e';
    valueElement.style.fontSize = '12px';
    valueElement.style.lineHeight = '1.4';
    valueElement.style.wordBreak = 'break-all';
    
    if (isLink && typeof value === 'string' && value.startsWith('http')) {
      const link = document.createElement('a');
      link.href = value;
      link.target = '_blank';
      link.textContent = value;
      link.style.color = '#007cba';
      link.style.textDecoration = 'underline';
      valueElement.appendChild(link);
    } else {
      valueElement.textContent = value;
    }
    
    row.appendChild(valueElement);
    container.appendChild(row);
  }

  /**
   * Extrait l'identifiant d'accession depuis une URI
   */
  extractAccessionFromURI(uri) {
    if (!uri) return 'N/A';
    
    // Pour d'autres ontologies
    const oboMatch = uri.match(/([A-Z]+)_(\d+)/);
    if (oboMatch) {
      return `${oboMatch[1]}:${oboMatch[2]}`;
    }
    
    // Retourner la dernière partie de l'URI
    return uri.split(/[/#]/).pop();
  }

  /**
   * Obtient un nom lisible pour une propriété
   */
  getReadablePropertyName(propUri) {
    const mappings = {
      'subClassOf': 'Is a type of',
      'type': 'Type',
      'broader': 'Broader concept',
      'narrower': 'Narrower concept', 
      'related': 'Related to',
      'sameAs': 'Same as',
      'equivalentClass': 'Equivalent to',
      'BFO_0000050': 'Part of',
      'RO_0002211': 'Regulates',
      'RO_0002212': 'Negatively regulates',
      'RO_0002213': 'Positively regulates',
      'label': 'Label',
      'comment': 'Comment',
      'definition': 'Definition',
      'hasDefinition': 'Definition',
      'hasExactSynonym': 'Exact Synonym',
      'hasRelatedSynonym': 'Related Synonym',
      'hasBroadSynonym': 'Broad Synonym',
      'hasNarrowSynonym': 'Narrow Synonym',
      'prefLabel': 'Preferred Label',
      'altLabel': 'Alternative Label',
      'title': 'Title',
      'description': 'Description',
      'id': 'ID'
    };
    
    const shortName = propUri.split(/[/#]/).pop();
    return mappings[shortName] || shortName.replace(/_/g, ' ');
  }

  /**
   * Affiche les détails de base d'un nœud
   */
  displayBasicNodeDetails(node, container = null) {
    // Supprimer l'ancien panneau s'il existe
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    // Créer un nouveau panneau
    const panel = document.createElement('div');
    panel.className = 'node-details-panel';
    
    // En-tête
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const title = document.createElement('h2');
    title.textContent = node.label || node.id;
    title.style.margin = '0';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'close-btn';
    closeBtn.addEventListener('click', () => panel.remove());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    
    // Contenu principal
    const content = document.createElement('div');
    content.className = 'panel-content';
    
    const basicInfo = document.createElement('div');
    basicInfo.innerHTML = `
      <h4>Informations disponibles</h4>
      <p><strong>ID:</strong> ${node.id}</p>
      <p><strong>Label:</strong> ${node.label}</p>
      ${node.uri ? `<p><strong>URI:</strong> <a href="${node.uri}" target="_blank">${node.uri}</a></p>` : ''}
    `;
    
    // Connexions
    const connections = this.links.filter(l => 
      l.source.id === node.id || l.target.id === node.id
    ).length;
    
    const connectionsInfo = document.createElement('p');
    connectionsInfo.innerHTML = `<strong>Connexions:</strong> ${connections}`;
    basicInfo.appendChild(connectionsInfo);
    
    content.appendChild(basicInfo);
    panel.appendChild(content);
    
    this.shadowRoot.querySelector('.graph-container').appendChild(panel);
  }
  
  /**
   * Affiche une notification temporaire
   */
  showNotification(message, type = 'info') {
    const oldNotification = this.shadowRoot.querySelector('.notification');
    if (oldNotification) {
      oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    this.shadowRoot.querySelector('.graph-container').appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  /**
   * Affiche une infobulle avec les détails d'un nœud
   */
  showTooltip(node, x, y) {
    this.hideTooltip();
    
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    
    this.tooltipTimeout = setTimeout(() => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      
      const title = document.createElement('h3');
      title.textContent = node.label;
      tooltip.appendChild(title);
      
      if (node.uri) {
        const uri = document.createElement('p');
        uri.innerHTML = `<strong>URI:</strong> ${node.uri}`;
        tooltip.appendChild(uri);
      }
      

      
      const connections = this.links.filter(l => 
        l.source.id === node.id || l.target.id === node.id
      ).length;
      const connectionsText = document.createElement('p');
      connectionsText.innerHTML = `<strong>Connexions:</strong> ${connections}`;
      tooltip.appendChild(connectionsText);
      
      tooltip.style.left = `${x + 15}px`;
      tooltip.style.top = `${y - 15}px`;
      
      this.shadowRoot.querySelector('.graph-container').appendChild(tooltip);
    }, 200);
  }
  
  /**
   * Cache l'infobulle
   */
  hideTooltip() {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    
    const tooltip = this.shadowRoot.querySelector('.tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  /**
   * Affiche une infobulle pour les liens
   */
  showLinkTooltip(text, x, y) {
    this.hideLinkTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'link-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '20';
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;
    tooltip.style.whiteSpace = 'pre-line';
    
    tooltip.textContent = text;
    
    this.shadowRoot.querySelector('.graph-container').appendChild(tooltip);
  }
  
  /**
   * Cache l'infobulle des liens
   */
  hideLinkTooltip() {
    const tooltip = this.shadowRoot.querySelector('.link-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
  
  /**
   * Affiche un menu contextuel pour un nœud
   */
  showContextMenu(node, x, y) {
    const oldMenu = this.shadowRoot.querySelector('.context-menu');
    if (oldMenu) {
      oldMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    const queryButton = document.createElement('button');
    queryButton.textContent = 'Récupérer les détails';
    queryButton.addEventListener('click', () => {
      this.executeNodeQuery(node);
      menu.remove();
    });
    menu.appendChild(queryButton);
    
    this.shadowRoot.querySelector('.graph-container').appendChild(menu);
    
    // Ajuster la position si nécessaire
    const container = this.shadowRoot.querySelector('.graph-container');
    const menuRect = menu.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (menuRect.right > containerRect.right) {
      menu.style.left = `${x - menuRect.width}px`;
    }
    
    if (menuRect.bottom > containerRect.bottom) {
      menu.style.top = `${y - menuRect.height}px`;
    }
  }

  /**
   * Rend le graphe avec D3.js
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .graph-container {
          width: ${this.width}px;
          height: ${this.height}px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        svg {
          width: 100%;
          height: 100%;
        }
        .links line {
          stroke: #999;
          stroke-opacity: 0.6;
          transition: stroke 0.3s, stroke-width 0.3s;
        }
        .links .directional {
          marker-end: url(#arrowhead);
        }
        .links .semantic {
          stroke: #888;
          stroke-opacity: 0.7;
        }
        .nodes circle {
          stroke: #fff;
          stroke-width: 1.5px;
          transition: stroke 0.3s, stroke-width 0.3s;
        }
        .node-label {
          font-size: 12px;
          pointer-events: none;
          fill: #333;
          text-anchor: middle;
          dominant-baseline: middle;
        }
        .node-highlighted circle {
          stroke: #ff4444 !important;
          stroke-width: 3px !important;
        }
        .link-highlighted {
          stroke: #ff4444 !important;
          stroke-width: 2px !important;
          stroke-opacity: 1 !important;
        }
        .tooltip {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          max-width: 300px;
          font-size: 12px;
        }
        .tooltip h3 {
          margin: 0 0 5px 0;
          font-size: 14px;
        }
        .tooltip p {
          margin: 3px 0;
        }
        .node-details-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 350px;
          max-height: calc(100% - 20px);
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: auto;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 5;
          display: flex;
          flex-direction: column;
        }
        .proxy-error-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 380px;
          max-height: calc(100% - 20px);
          background: linear-gradient(135deg, #fff3cd 0%, #fef5e7 100%);
          border: 2px solid #f0ad4e;
          border-radius: 8px;
          overflow: auto;
          box-shadow: 0 4px 12px rgba(240, 173, 78, 0.3);
          z-index: 15;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .error-header {
          padding: 15px;
          background: linear-gradient(135deg, #f0ad4e 0%, #ec971f 100%);
          color: white;
          border-radius: 6px 6px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .error-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }
        .error-content {
          padding: 20px;
        }
        .error-message {
          margin-bottom: 20px;
          color: #8a6d3b;
          line-height: 1.5;
        }
        .error-message p {
          margin: 10px 0;
        }
        .error-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .doc-button, .console-button {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          flex: 1;
          min-width: 120px;
        }
        .doc-button {
          background: linear-gradient(135deg, #5bc0de 0%, #31b0d5 100%);
          color: white;
        }
        .doc-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(91, 192, 222, 0.3);
        }
        .console-button {
          background: linear-gradient(135deg, #5cb85c 0%, #449d44 100%);
          color: white;
        }
        .console-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(92, 184, 92, 0.3);
        }
        .quick-solution {
          background: rgba(23, 162, 184, 0.1);
          border: 1px solid rgba(23, 162, 184, 0.3);
          border-radius: 5px;
          padding: 15px;
          margin-top: 15px;
        }
        .quick-solution h4 {
          color: #117a8b;
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .quick-solution ol {
          margin: 0;
          padding-left: 20px;
          color: #495057;
        }
        .quick-solution li {
          margin: 5px 0;
          font-size: 13px;
        }
        .quick-solution code {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 5px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          color: #e83e8c;
        }
        .panel-header {
          padding: 10px;
          background: #f0f0f0;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .close-btn {
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          color: white;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .node-uri {
          padding: 10px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .panel-content {
          padding: 10px;
          overflow: auto;
        }
        .panel-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .panel-content th,
        .panel-content td {
          text-align: left;
          padding: 5px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .context-menu {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 5px 0;
          z-index: 20;
        }
        .context-menu button {
          display: block;
          width: 100%;
          border: none;
          background: white;
          padding: 8px 15px;
          text-align: left;
          cursor: pointer;
        }
        .context-menu button:hover {
          background: #f0f0f0;
        }
        .notification {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 30;
          transition: opacity 0.5s;
        }
        .notification.info {
          background: #e3f2fd;
          border: 1px solid #2196f3;
        }
        .notification.error {
          background: #ffebee;
          border: 1px solid #f44336;
        }
        .notification.fade-out {
          opacity: 0;
        }
        .proxy-error-panel .error-header { /* Style spécifique pour le header du panneau d'erreur proxy */
          padding: 15px;
          background: linear-gradient(135deg, #f0ad4e 0%, #ec971f 100%);
          color: white;
          border-radius: 6px 6px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .proxy-error-panel .error-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }
        .proxy-error-panel .error-content {
          padding: 20px;
        }
        .proxy-error-panel .error-message {
          margin-bottom: 20px;
          color: #8a6d3b;
          line-height: 1.5;
        }
        .proxy-error-panel .error-message p {
          margin: 10px 0;
        }
        .proxy-error-panel .error-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .proxy-error-panel .doc-button, .proxy-error-panel .console-button {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          flex: 1;
          min-width: 120px;
        }
        .proxy-error-panel .doc-button {
          background: linear-gradient(135deg, #5bc0de 0%, #31b0d5 100%);
          color: white;
        }
        .proxy-error-panel .doc-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(91, 192, 222, 0.3);
        }
        .proxy-error-panel .console-button {
          background: linear-gradient(135deg, #5cb85c 0%, #449d44 100%);
          color: white;
        }
        .proxy-error-panel .console-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(92, 184, 92, 0.3);
        }
        .proxy-error-panel .quick-summary { /* Style pour le résumé rapide */
          background: rgba(23, 162, 184, 0.05);
          border: 1px solid rgba(23, 162, 184, 0.2);
          border-radius: 5px;
          padding: 15px;
          margin-top: 15px;
        }
        .proxy-error-panel .quick-summary h4 {
          color: #117a8b;
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .proxy-error-panel .quick-summary ol {
          margin: 0;
          padding-left: 20px;
          color: #495057;
        }
        .proxy-error-panel .quick-summary li {
          margin: 5px 0;
          font-size: 13px;
        }
        .proxy-error-panel .quick-summary code {
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 5px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          color: #e83e8c;
        }
        .panel-header {
          padding: 10px;
          background: #f0f0f0;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .close-btn {
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          color: #6c757d; /* Couleur plus neutre pour le bouton de fermeture */
        }
        .close-btn:hover {
          background: rgba(0, 0, 0, 0.1); /* Ajuster pour un fond clair */
          border-radius: 3px;
        }
        .node-uri {
          padding: 10px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .panel-content {
          padding: 10px;
          overflow: auto;
        }
        .panel-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .panel-content th,
        .panel-content td {
          text-align: left;
          padding: 5px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .context-menu {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 5px 0;
          z-index: 20;
        }
        .context-menu button {
          display: block;
          width: 100%;
          border: none;
          background: white;
          padding: 8px 15px;
          text-align: left;
          cursor: pointer;
        }
        .context-menu button:hover {
          background: #f0f0f0;
        }
        .notification {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 30;
          transition: opacity 0.5s;
        }
        .notification.info {
          background: #e3f2fd;
          border: 1px solid #2196f3;
        }
        .notification.error {
          background: #ffebee;
          border: 1px solid #f44336;
        }
        .notification.fade-out {
          opacity: 0;
        }
        .encoding-title {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.9);
          padding: 8px 15px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          font-size: 14px;
          font-weight: bold;
          color: #333;
          z-index: 5;
          max-width: 80%;
          text-align: center;
        }
        .legend-container {
          position: absolute;
          bottom: 15px;
          left: 15px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 5;
          min-width: 180px;
          max-width: 300px;
          max-height: 400px;
          overflow-y: auto;
        }
        .legend-container::-webkit-scrollbar {
          width: 6px;
        }
        .legend-container::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
          border-radius: 3px;
        }
        .legend-container::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.3);
          border-radius: 3px;
        }
        .legend-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.5);
        }
        .legend-section {
          margin-bottom: 15px;
        }
        .legend-section:last-child {
          margin-bottom: 0;
        }
        .legend-title {
          font-size: 13px;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
          border-bottom: 1px solid #eee;
          padding-bottom: 4px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .legend-item:last-child {
          margin-bottom: 0;
        }
        .legend-color {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          margin-right: 8px;
          border: 1px solid #ccc;
          flex-shrink: 0;
        }
        .legend-line {
          width: 20px;
          height: 2px;
          margin-right: 8px;
          flex-shrink: 0;
        }
        .legend-size {
          border-radius: 50%;
          margin-right: 8px;
          border: 1px solid #ccc;
          flex-shrink: 0;
        }
        .legend-label {
          color: #555;
          word-break: break-word;
        }
      </style>
      <div class="graph-container">
        <svg></svg>
      </div>
    `;

          this.createForceGraph();
      this.createLegends();
      this.initGlobalEventHandlers();
  }
  
  /**
   * Initialise les gestionnaires d'événements globaux
   */
  initGlobalEventHandlers() {
    const container = this.shadowRoot.querySelector('.graph-container');
    
    container.addEventListener('click', (event) => {
      const contextMenu = this.shadowRoot.querySelector('.context-menu');
      if (contextMenu) {
        contextMenu.remove();
      }
    });
    
    container.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
    
    container.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  /**
   * Crée une visualisation force-directed avec D3.js
   */
  createForceGraph() {
    const svg = d3.select(this.shadowRoot.querySelector('svg'));
    const width = this.width;
    const height = this.height;
    
    svg.selectAll("*").remove();
    
    // Ajouter les définitions pour les flèches
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10) // Augmenté pour décaler la flèche
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");
    
    // CORRECTION: Validation stricte des données avant le rendu
    if (!this.nodes || this.nodes.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Aucune donnée à visualiser");
        
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Please enter a SPARQL endpoint and query.");
        
      return;
    }

    // CORRECTION: Vérification de l'intégrité des données
    const validNodes = this.nodes.filter(node => node && node.id !== undefined && node.id !== null);
    const validLinks = this.links.filter(link => 
      link && 
      link.source !== undefined && link.source !== null &&
      link.target !== undefined && link.target !== null
    );

    if (validNodes.length !== this.nodes.length) {
      this._logWarn(`${this.nodes.length - validNodes.length} invalid nodes removed`);
      this.nodes = validNodes;
    }

    if (validLinks.length !== this.links.length) {
      this._logWarn(`${this.links.length - validLinks.length} invalid links removed`);
      this.links = validLinks;
    }

    if (validNodes.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Erreur: données corrompues détectées");
      return;
    }

    const mapping = this.visualEncoding;

    // --- ENCODING LOGIC ---
    // Create clear, explicit functions to get visual properties based on the encoding.
    
    // Node Color (avec cache)
    const nodeColorConfig = mapping.nodes.color || {};
    const nodeColorScale = nodeColorConfig.scale ? 
      this._getOrCreateScale(`nodeColor-${nodeColorConfig.field}`, nodeColorConfig.scale, this.nodes, nodeColorConfig.field, true) : null;
    const getNodeColor = d => {
      try {
        if (nodeColorScale && nodeColorConfig.field && d[nodeColorConfig.field] !== undefined) {
          // CORRECTION: On vérifie que la valeur du noeud est bien dans le domaine de l'échelle
          if (nodeColorScale.domain().includes(d[nodeColorConfig.field])) {
            const color = nodeColorScale(d[nodeColorConfig.field]);
            return color || '#cccccc'; // Protection contre les couleurs invalides
          }
          // Si la valeur n'est pas dans le domaine, on ignore l'échelle et on passe aux fallbacks.
        }
        // Fallback 1: Utiliser une valeur directe si elle est définie
        // Fallback 2: Utiliser un gris neutre pour les cas non définis
        return nodeColorConfig.value || '#cccccc';
      } catch (error) {
        this._logWarn('Error in getNodeColor:', error.message);
        return '#cccccc'; // Couleur de sécurité
      }
    };

    // Node Size (avec cache)
    const nodeSizeConfig = mapping.nodes.size || {};
    const nodeSizeScale = nodeSizeConfig.scale ? 
      this._getOrCreateScale(`nodeSize-${nodeSizeConfig.field}`, nodeSizeConfig.scale, this.nodes, nodeSizeConfig.field, false) : null;
    const getNodeRadius = d => {
      try {
        if (nodeSizeScale && nodeSizeConfig.field && d[nodeSizeConfig.field] !== undefined) {
          const radius = nodeSizeScale(d[nodeSizeConfig.field]);
          // Vérifier que le rayon est un nombre valide et positif
          if (typeof radius === 'number' && !isNaN(radius) && radius > 0) {
            return radius;
          }
        }
        const fallbackRadius = nodeSizeConfig.value || 10;
        return typeof fallbackRadius === 'number' && !isNaN(fallbackRadius) && fallbackRadius > 0 ? fallbackRadius : 10;
      } catch (error) {
        this._logWarn('Error in getNodeRadius:', error.message);
        return 10; // Rayon de sécurité
      }
    };

    // Link Color (avec cache)
    const linkColorConfig = mapping.links.color || {};
    const linkColorScale = linkColorConfig.scale ? 
      this._getOrCreateScale(`linkColor-${linkColorConfig.field}`, linkColorConfig.scale, this.links, linkColorConfig.field, true) : null;
    const getLinkColor = d => {
      if (linkColorScale && linkColorConfig.field && d[linkColorConfig.field] !== undefined) {
        // CORRECTION: On vérifie aussi pour les liens
        if (linkColorScale.domain().includes(d[linkColorConfig.field])) {
          return linkColorScale(d[linkColorConfig.field]);
        }
      }
      return linkColorConfig.value || '#999'; // Final fallback
    };

    // Link Width
    // Handle both "Width" (from user example) and "width"
    const linkWidthConfig = mapping.links.width || mapping.links.Width || {};
    const getLinkWidth = () => {
        return linkWidthConfig.value || 1.5; // Only direct value supported for now
    };
    
    // Link Distance
    const linkDistance = mapping.links.distance || 100;

    const simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links).id(d => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 5)) // Padding
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));

    const constrainNode = (d) => {
      const radius = getNodeRadius(d);
      d.x = Math.max(radius, Math.min(width - radius, d.x));
      d.y = Math.max(radius, Math.min(height - radius, d.y));
    };
        
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('class', d => d.type || 'directional')
      .attr('stroke', getLinkColor)
      .attr('stroke-width', getLinkWidth())
      .on('mouseover', (event, d) => {
        // Tooltip pour les liens
        let tooltipText = '';
        if (d.type === 'semantic') {
          const sourceNode = this.nodes.find(n => n.id === d.source.id);
          const targetNode = this.nodes.find(n => n.id === d.target.id);
          tooltipText = `${sourceNode ? sourceNode.label : d.source.id} ↔ ${targetNode ? targetNode.label : d.target.id}`;
          tooltipText += `\nRelation: ${d.semanticLabel || d.tooltip || 'relation'}`;
        } else {
          // Liens directionnels
          const sourceNode = this.nodes.find(n => n.id === d.source.id);
          const targetNode = this.nodes.find(n => n.id === d.target.id);
          tooltipText = `${sourceNode ? sourceNode.label : d.source.id} → ${targetNode ? targetNode.label : d.target.id}`;
        }
        this.showLinkTooltip(tooltipText, event.offsetX, event.offsetY);
      })
      .on('mouseout', () => {
        this.hideLinkTooltip();
      });
      
    const nodeGroup = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('mouseover', (event, d) => {
        const connectedLinks = this.links.filter(l => 
          l.source.id === d.id || l.target.id === d.id
        );
        
        const connectedNodeIds = new Set(connectedLinks.flatMap(l => 
          [l.source.id, l.target.id]
        ));
        
        link.classed('link-highlighted', l => 
          l.source.id === d.id || l.target.id === d.id
        );
        
        nodeGroup.classed('node-highlighted', n => 
          connectedNodeIds.has(n.id)
        );
        
        this.showTooltip(d, event.offsetX, event.offsetY);
      })
      .on('mouseout', () => {
        link.classed('link-highlighted', false);
        nodeGroup.classed('node-highlighted', false);
        this.hideTooltip();
      })
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        this.showContextMenu(d, event.offsetX, event.offsetY);
      });
      
    nodeGroup.append('circle')
      .attr('r', getNodeRadius)
      .attr('fill', getNodeColor);
    
    nodeGroup.append('text')
      .attr('class', 'node-label')
      .text(d => d.label || d.id);
        
    // Fonction pour calculer la position du lien en tenant compte du rayon du nœud
    const calculateLinkPosition = (link) => {
      const source = link.source;
      const target = link.target;
      
      if (isNaN(source.x) || isNaN(source.y) || isNaN(target.x) || isNaN(target.y)) {
        return { x1: 0, y1: 0, x2: 0, y2: 0 };
      }
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance === 0) {
        return { x1: source.x, y1: source.y, x2: target.x, y2: target.y };
      }
      
      const sourceRadius = getNodeRadius(source);
      const targetRadius = getNodeRadius(target);
      
      // Calcul des vecteurs unitaires
      const unitX = dx / distance;
      const unitY = dy / distance;
      
      // Position de départ (décalée du rayon du nœud source)
      const x1 = source.x + unitX * sourceRadius;
      const y1 = source.y + unitY * sourceRadius;
      
      // Position d'arrivée (décalée du rayon du nœud cible)
      const x2 = target.x - unitX * targetRadius;
      const y2 = target.y - unitY * targetRadius;
      
      return { x1, y1, x2, y2 };
    };

    simulation.on('tick', () => {
      nodeGroup.each(constrainNode);
      
      link.each(function(d) {
        const positions = calculateLinkPosition(d);
        d3.select(this)
          .attr('x1', positions.x1)
          .attr('y1', positions.y1)
          .attr('x2', positions.x2)
          .attr('y2', positions.y2);
      });
      
      nodeGroup.attr('transform', d => {
        const x = isNaN(d.x) ? width / 2 : d.x;
        const y = isNaN(d.y) ? height / 2 : d.y;
        return `translate(${x},${y})`;
      });
    });
    
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      const radius = getNodeRadius(d);
      d.fx = Math.max(radius, Math.min(width - radius, event.x));
      d.fy = Math.max(radius, Math.min(height - radius, event.y));
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  /**
   * Crée une échelle D3 à partir d'une configuration de type VEGA avec calcul automatique du domaine.
   * @param {object} scaleConfig - La configuration de l'échelle (`domain`, `range`, `type`).
   * @param {Array} data - Les données à utiliser pour calculer le domaine (optionnel).
   * @param {string} field - Le champ à analyser pour calculer le domaine (optionnel).
   * @param {d3.Scale} defaultScale - L'échelle D3 à utiliser si la configuration est invalide.
   * @param {boolean} isColorScale - True si c'est une échelle de couleur, false pour les autres propriétés.
   * @returns {d3.Scale} L'échelle D3 configurée avec domaine calculé.
   */
  createD3Scale(scaleConfig, data = null, field = null, defaultScale = null, isColorScale = false) {
    this._logDebug(`Creating D3 scale for field "${field}"`);
    
    if (!scaleConfig) {
      this._logWarn(`Invalid scale configuration`);
      return defaultScale;
    }

    const type = scaleConfig.type || 'ordinal';
    
    // --- CALCUL AUTOMATIQUE DU DOMAINE ---
    let finalDomain;
    
    if (data && field && this.domainCalculator) {
      // Utiliser le DomainCalculator pour calculer le domaine approprié
      const userDomain = scaleConfig.domain; // Peut être undefined/null
      try {
        finalDomain = this.domainCalculator.getDomain(data, field, userDomain, type);
      } catch (error) {
        this._logWarn(`Error while calculating domain for "${field}":`, error.message);
        return defaultScale;
      }
      
      this._logDebug(`Domain calculated automatically:`, finalDomain);
      
      if (!finalDomain || finalDomain.length === 0) {
        this._logWarn(`No values found for field "${field}"`);
        return defaultScale;
      }
    } else if (scaleConfig.domain && Array.isArray(scaleConfig.domain) && scaleConfig.domain.length > 0) {
      // Utiliser le domaine fourni tel quel (avec validation)
      finalDomain = scaleConfig.domain;
      this._logDebug(`Using provided domain:`, finalDomain);
    } else {
      this._logWarn(`No valid domain available to create scale`);
      return defaultScale;
    }
    
    // --- CRÉATION DE L'ÉCHELLE D3 ---
    const range = scaleConfig.range || null;
    const scaleType = type === 'linear' || type === 'sqrt' || type === 'log' || type === 'quantitative' || type === 'sequential' ? 'quantitative' : 'ordinal';
    
    try {
      if (isColorScale) {
        // Pour les échelles de couleur, utiliser le ColorScaleCalculator
        // Le domaine est déjà calculé par le DomainCalculator
        const colorScale = this.colorScaleCalculator.createColorScale({
          domain: finalDomain,
          range: range,
          scaleType: scaleType,
          fallbackInterpolator: null, // Utiliser le système intelligent
          label: `Color[${field}]`
        });
        
        if (colorScale) {
          this._logDebug(`${scaleType} color scale created with ColorScaleCalculator for "${field}"`);
          this._logDebug(`-> Domain:`, finalDomain);
          this._logDebug(`-> Range:`, range);
          
          return colorScale;
        } else {
          this._logDebug(`ColorScaleCalculator returned no scale, using fallback`);
          return defaultScale;
        }
      } else {
        // Pour les autres échelles (taille, largeur, etc.), utiliser D3 directement
        const finalRange = range || [5, 20]; // Range par défaut pour les tailles
        
        let scale;
        if (type === 'linear') {
          scale = d3.scaleLinear()
            .domain(finalDomain)
            .range(finalRange);
        } else if (type === 'sqrt') {
          scale = d3.scaleSqrt()
            .domain(finalDomain)
            .range(finalRange);
        } else if (type === 'log') {
          scale = d3.scaleLog()
            .domain(finalDomain)
            .range(finalRange);
        } else if (type === 'pow') {
          scale = d3.scalePow()
            .exponent(2) // Exposant par défaut (carré)
            .domain(finalDomain)
            .range(finalRange);
        } else if (type === 'quantitative' || type === 'sequential') {
          scale = d3.scaleLinear()
            .domain(finalDomain)
            .range(finalRange);
        } else {
          // Pour ordinal, utiliser scaleOrdinal avec range numérique
          scale = d3.scaleOrdinal()
            .domain(finalDomain)
            .range(finalRange);
        }
        
        this._logDebug(`${type} scale created directly with D3 for "${field}"`);
        this._logDebug(`-> Final domain:`, finalDomain);
        this._logDebug(`-> Range:`, finalRange);
        
        return scale;
      }
    } catch (error) {
      // Ne pas re-logger les erreurs déjà traitées par ColorScaleCalculator
      if (!error.message.includes('Unsupported range format')) {
        this._logError(`Error while creating scale:`, error.message);
      }
      return defaultScale;
    }
  }

  /**
   * Crée les légendes pour les nœuds et les liens selon l'encoding visuel
   */
  createLegends() {
    // Supprimer les anciens éléments de légende et titre
    const oldTitle = this.shadowRoot.querySelector('.encoding-title');
    if (oldTitle) oldTitle.remove();
    
    const oldLegend = this.shadowRoot.querySelector('.legend-container');
    if (oldLegend) oldLegend.remove();
    
    const container = this.shadowRoot.querySelector('.graph-container');
    
    // Ajouter le titre de l'encoding en haut
    if (this.visualEncoding && this.visualEncoding.description) {
      const titleElement = document.createElement('div');
      titleElement.className = 'encoding-title';
      titleElement.textContent = this.visualEncoding.description;
      container.appendChild(titleElement);
    }
    
    // Créer le conteneur des légendes
    const legendContainer = document.createElement('div');
    legendContainer.className = 'legend-container';
    
    let hasLegends = false;
    
    // Légende pour les couleurs des nœuds
    if (this.visualEncoding?.nodes?.color?.legend?.display && 
        this.visualEncoding?.nodes?.color?.scale && 
        this.visualEncoding?.nodes?.color?.field && 
        !this.visualEncoding?.nodes?.color?.value) {
      // Récupérer l'échelle D3 réelle pour les couleurs
      const nodeColorScale = this._getOrCreateScale(
        `nodeColor-${this.visualEncoding.nodes.color.field}`, 
        this.visualEncoding.nodes.color.scale, 
        this.nodes, 
        this.visualEncoding.nodes.color.field, 
        true
      );
      
      const nodeColorLegend = this.createColorLegend(
        this.visualEncoding.nodes.color,
        this.visualEncoding.nodes.color.legend.title || 'Node Colors',
        false,
        nodeColorScale
      );
      if (nodeColorLegend) {
        legendContainer.appendChild(nodeColorLegend);
        hasLegends = true;
      }
    }
    
    // Légende pour les tailles des nœuds
    if (this.visualEncoding?.nodes?.size?.legend?.display && 
        this.visualEncoding?.nodes?.size?.scale && 
        this.visualEncoding?.nodes?.size?.field && 
        !this.visualEncoding?.nodes?.size?.value) {
      // Récupérer l'échelle D3 réelle pour les tailles
      const nodeSizeScale = this._getOrCreateScale(
        `nodeSize-${this.visualEncoding.nodes.size.field}`, 
        this.visualEncoding.nodes.size.scale, 
        this.nodes, 
        this.visualEncoding.nodes.size.field, 
        false
      );
      
      const nodeSizeLegend = this.createSizeLegend(
        this.visualEncoding.nodes.size,
        this.visualEncoding.nodes.size.legend.title || 'Node Sizes',
        nodeSizeScale
      );
      if (nodeSizeLegend) {
        legendContainer.appendChild(nodeSizeLegend);
        hasLegends = true;
      }
    }
    

    
    // Ajouter le conteneur des légendes seulement s'il y a des légendes à afficher
    if (hasLegends) {
      container.appendChild(legendContainer);
    }
  }
  
  /**
   * Crée une légende pour les couleurs
   * @param {Object} colorConfig - Configuration de couleur (field, scale, etc.)
   * @param {string} title - Titre de la légende
   * @param {boolean} isLink - True si c'est pour les liens, false pour les nœuds
   * @param {d3.Scale} d3Scale - Échelle D3 réelle pour récupérer les vraies couleurs
   * @returns {HTMLElement|null} L'élément de légende ou null
   */
  createColorLegend(colorConfig, title, isLink = false, d3Scale = null) {
    if (!colorConfig.scale || !colorConfig.scale.domain) {
      return null;
    }
    
    const section = document.createElement('div');
    section.className = 'legend-section';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'legend-title';
    titleElement.textContent = title;
    section.appendChild(titleElement);
    
    const domain = colorConfig.scale.domain;
    
    // Créer les éléments de légende
    domain.forEach((value, index) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      
      // Récupérer la couleur réelle depuis l'échelle D3 si disponible
      let color;
      if (d3Scale && typeof d3Scale === 'function') {
        try {
          color = d3Scale(value);
        } catch (error) {
          this._logWarn(`Error getting color from D3 scale for value "${value}":`, error);
          color = '#cccccc'; // Couleur de fallback
        }
      } else if (Array.isArray(colorConfig.scale.range) && index < colorConfig.scale.range.length) {
        // Fallback vers le range de la configuration si c'est un array
        color = colorConfig.scale.range[index];
      } else {
        // Fallback final
        color = '#cccccc';
      }
      
      if (isLink) {
        // Pour les liens, afficher une ligne
        const line = document.createElement('div');
        line.className = 'legend-line';
        line.style.backgroundColor = color;
        item.appendChild(line);
      } else {
        // Pour les nœuds, afficher un cercle
        const circle = document.createElement('div');
        circle.className = 'legend-color';
        circle.style.backgroundColor = color;
        item.appendChild(circle);
      }
      
      const label = document.createElement('span');
      label.className = 'legend-label';
      label.textContent = value;
      item.appendChild(label);
      
      section.appendChild(item);
    });
    
    return section;
  }
  
  /**
   * Crée une légende pour les tailles
   * @param {Object} sizeConfig - Configuration de taille (field, scale, etc.)
   * @param {string} title - Titre de la légende
   * @param {d3.Scale} d3Scale - Échelle D3 réelle pour récupérer les vraies tailles
   * @returns {HTMLElement|null} L'élément de légende ou null
   */
  createSizeLegend(sizeConfig, title, d3Scale = null) {
    if (!sizeConfig.scale || !sizeConfig.scale.domain) {
      return null;
    }
    
    const section = document.createElement('div');
    section.className = 'legend-section';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'legend-title';
    titleElement.textContent = title;
    section.appendChild(titleElement);
    
    const domain = sizeConfig.scale.domain;
    
    // Pour les légendes de taille, montrer seulement quelques valeurs représentatives
    let sampleValues;
    if (d3Scale && typeof d3Scale === 'function') {
      // Utiliser l'échelle D3 réelle pour calculer les tailles
      sampleValues = this.getSampleValuesFromD3Scale(domain, d3Scale, 3);
    } else {
      // Fallback vers la méthode originale avec le range de la configuration
      const range = sizeConfig.scale.range || [5, 20];
      sampleValues = this.getSampleValues(domain, range, 3);
    }
    
    sampleValues.forEach(({ value, size }) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      
      const circle = document.createElement('div');
      circle.className = 'legend-size';
      circle.style.width = `${Math.min(size, 20)}px`;
      circle.style.height = `${Math.min(size, 20)}px`;
      circle.style.backgroundColor = '#ccc';
      item.appendChild(circle);
      
      const label = document.createElement('span');
      label.className = 'legend-label';
      label.textContent = value;
      item.appendChild(label);
      
      section.appendChild(item);
    });
    
    return section;
  }
  
  /**
   * Génère des valeurs d'échantillon pour les légendes de taille
   * @param {Array} domain - Domaine de l'échelle
   * @param {Array} range - Range de l'échelle  
   * @param {number} count - Nombre d'échantillons à générer
   * @returns {Array} Array d'objets {value, size}
   */
  getSampleValues(domain, range, count = 3) {
    if (domain.length <= count) {
      return domain.map((value, index) => ({
        value,
        size: range[Math.min(index, range.length - 1)]
      }));
    }
    
    const samples = [];
    const step = (domain.length - 1) / (count - 1);
    
    for (let i = 0; i < count; i++) {
      const index = Math.round(i * step);
      const value = domain[index];
      const size = range[Math.min(index, range.length - 1)];
      samples.push({ value, size });
    }
    
    return samples;
  }
  
  /**
   * Génère des valeurs d'échantillon en utilisant une échelle D3 réelle
   * @param {Array} domain - Domaine de l'échelle
   * @param {d3.Scale} d3Scale - Échelle D3 réelle
   * @param {number} count - Nombre d'échantillons à générer
   * @returns {Array} Array d'objets {value, size}
   */
  getSampleValuesFromD3Scale(domain, d3Scale, count = 3) {
    if (!domain || domain.length === 0) {
      return [];
    }
    
    // Pour les domaines courts, utiliser toutes les valeurs
    if (domain.length <= count) {
      return domain.map(value => {
        try {
          const size = d3Scale(value);
          return { value, size: typeof size === 'number' ? size : 10 };
        } catch (error) {
          this._logWarn(`Error getting size from D3 scale for value "${value}":`, error);
          return { value, size: 10 };
        }
      });
    }
    
    const samples = [];
    
    // Pour les domaines numériques longs, utiliser min, milieu, max
    if (domain.length > 10 && this.isNumericDomain(domain)) {
      const indices = [0, Math.floor(domain.length / 2), domain.length - 1];
      
      indices.forEach(index => {
        const value = domain[index];
        try {
          const size = d3Scale(value);
          samples.push({ 
            value, 
            size: typeof size === 'number' ? size : 10 
          });
        } catch (error) {
          this._logWarn(`Error getting size from D3 scale for value "${value}":`, error);
          samples.push({ value, size: 10 });
        }
      });
    } else {
      // Pour les domaines catégoriels ou courts, distribution uniforme
      const step = (domain.length - 1) / (count - 1);
      
      for (let i = 0; i < count; i++) {
        const index = Math.round(i * step);
        const value = domain[index];
        
        try {
          const size = d3Scale(value);
          samples.push({ 
            value, 
            size: typeof size === 'number' ? size : 10 
          });
        } catch (error) {
          this._logWarn(`Error getting size from D3 scale for value "${value}":`, error);
          samples.push({ value, size: 10 });
        }
      }
    }
    
    return samples;
  }
  
  /**
   * Vérifie si un domaine contient des valeurs numériques
   * @param {Array} domain - Domaine à tester
   * @returns {boolean} True si le domaine est numérique
   */
  isNumericDomain(domain) {
    return domain.every(value => typeof value === 'number' || !isNaN(Number(value)));
  }

  /**
   * Détecte automatiquement les champs de classification de niveau supérieur
   * dans les données pour l'encodage des couleurs.
   * @param {Array} data - Les données (nodes ou links)
   * @param {Array} sparqlVars - Les variables SPARQL disponibles
   * @returns {Object} Information sur le meilleur champ de classification trouvé
   */
  detectClassificationField(data, sparqlVars) {
    if (!data || data.length === 0 || !sparqlVars) {
      return { field: 'type', reason: 'Aucune donnée disponible, utilisation du fallback' };
    }

    // Mots-clés qui indiquent des champs de classification (par ordre de priorité)
    const classificationKeywords = [
      { keywords: ['class', 'category', 'groupe', 'group'], priority: 5, description: 'Classification principale' },
      { keywords: ['type', 'kind', 'sort'], priority: 4, description: 'Type/sorte' },
      { keywords: ['level', 'niveau', 'rank', 'rang'], priority: 3, description: 'Niveau hiérarchique' },
      { keywords: ['domain', 'domaine', 'realm'], priority: 3, description: 'Domaine' },
      { keywords: ['namespace', 'ns', 'prefix'], priority: 2, description: 'Espace de noms' },
      { keywords: ['source', 'origin', 'provenance'], priority: 2, description: 'Source/origine' },
      { keywords: ['label', 'name', 'title'], priority: 1, description: 'Label (plus granulaire)' }
    ];

    const candidateFields = [];

    // Analyser chaque variable SPARQL pour trouver des champs de classification
    this._logDebug(`Analyzing SPARQL variables for classification detection:`, sparqlVars);
    
    sparqlVars.forEach(varName => {
      const lowerVarName = varName.toLowerCase();
      
      // Chercher des correspondances avec les mots-clés de classification
      classificationKeywords.forEach(({ keywords, priority, description }) => {
        keywords.forEach(keyword => {
          if (lowerVarName.includes(keyword)) {
            this._logDebug(`Variable "${varName}" matches keyword "${keyword}"`);
            
            // Analyser les valeurs de ce champ dans les données
            const fieldStats = this.analyzeFieldForClassification(data, varName);
            
            this._logDebug(`Stats for "${varName}":`, {
              uniqueCount: fieldStats.uniqueCount,
              coverage: Math.round(fieldStats.coverage * 100) + '%',
              isGood: fieldStats.isGoodForClassification,
              samples: fieldStats.sampleValues
            });
            
            if (fieldStats.isGoodForClassification) {
              candidateFields.push({
                field: varName,
                priority: priority,
                description: description,
                uniqueCount: fieldStats.uniqueCount,
                coverage: fieldStats.coverage,
                sampleValues: fieldStats.sampleValues,
                reason: `Détecté via mot-clé "${keyword}" - ${description}`
              });
            }
          }
        });
      });
    });

    // Si aucun champ candidat trouvé, analyser tous les champs pour trouver de bonnes classifications
    if (candidateFields.length === 0) {
      this._logDebug('No obvious classification field, analyzing all fields...');
      
      sparqlVars.forEach(varName => {
        const fieldStats = this.analyzeFieldForClassification(data, varName);
        
        if (fieldStats.isGoodForClassification) {
          candidateFields.push({
            field: varName,
            priority: 1, // Priorité plus basse car pas de mot-clé évident
            description: 'Classification détectée par analyse',
            uniqueCount: fieldStats.uniqueCount,
            coverage: fieldStats.coverage,
            sampleValues: fieldStats.sampleValues,
            reason: `Analyse automatique - ${fieldStats.uniqueCount} valeurs uniques`
          });
        }
      });
    }

    // Afficher tous les candidats trouvés
    if (candidateFields.length > 0) {
      this._logDebug(`${candidateFields.length} candidate field(s) found:`);
      candidateFields.forEach((candidate, index) => {
        this._logDebug(`  ${index + 1}. "${candidate.field}" (priority: ${candidate.priority}, ${candidate.uniqueCount} values, ${Math.round(candidate.coverage * 100)}%)`);
      });
    }

    // Trier les candidats par priorité et qualité
    candidateFields.sort((a, b) => {
      // D'abord par priorité (plus élevée = mieux)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Ensuite par nombre optimal de valeurs uniques (entre 2 et 12 idéalement)
      const optimalA = Math.abs(a.uniqueCount - 6); // 6 est le nombre "idéal"
      const optimalB = Math.abs(b.uniqueCount - 6);
      if (optimalA !== optimalB) {
        return optimalA - optimalB;
      }
      // Enfin par couverture (plus élevée = mieux)
      return b.coverage - a.coverage;
    });

    if (candidateFields.length > 0) {
      const bestField = candidateFields[0];
              this._logDebug(`Best classification field detected: "${bestField.field}"`);
        this._logDebug(`-> Reason: ${bestField.reason}`);
        this._logDebug(`-> Unique values: ${bestField.uniqueCount}, Coverage: ${Math.round(bestField.coverage * 100)}%`);
        this._logDebug(`-> Sample values:`, bestField.sampleValues);
      
      return bestField;
    }

    // Fallback vers le champ "type" calculé
    this._logDebug('No suitable classification field found, using fallback "type"');
    return { 
      field: 'type', 
      reason: 'Fallback - aucun champ de classification adapté détecté',
      uniqueCount: 2,
      coverage: 1.0,
      sampleValues: ['uri', 'literal']
    };
  }

  /**
   * Analyse un champ spécifique pour déterminer s'il convient à la classification.
   * @param {Array} data - Les données à analyser
   * @param {string} fieldName - Le nom du champ à analyser
   * @returns {Object} Statistiques d'analyse du champ
   */
  analyzeFieldForClassification(data, fieldName) {
    const values = this.domainCalculator.getVal(data, fieldName);
    const uniqueCount = values.length;
    const totalCount = data.length;
    const coverage = totalCount > 0 ? uniqueCount / totalCount : 0;
    
    // Critères pour qu'un champ soit bon pour la classification :
    // 1. Au moins 2 valeurs uniques (sinon pas de distinction)
    // 2. Pas plus de 20 valeurs uniques (sinon trop granulaire pour les couleurs)
    // 3. Couverture raisonnable (pas trop de valeurs manquantes)
    // 4. Les valeurs ne sont pas toutes des URIs longues (pas lisible)
    
    const isGoodForClassification = 
      uniqueCount >= 2 && 
      uniqueCount <= 20 && 
      coverage >= 0.1 && // Au moins 10% des éléments ont cette propriété
      this.areValuesReadableForClassification(values);
    
    return {
      isGoodForClassification,
      uniqueCount,
      coverage,
      sampleValues: values.slice(0, 3), // Échantillon des 3 premières valeurs
      avgValueLength: values.reduce((sum, val) => sum + String(val).length, 0) / values.length
    };
  }

  /**
   * Vérifie si les valeurs d'un champ sont lisibles pour la classification.
   * @param {Array} values - Les valeurs à analyser
   * @returns {boolean} True si les valeurs sont lisibles
   */
  areValuesReadableForClassification(values) {
    if (values.length === 0) return false;
    
    // Calculer la longueur moyenne des valeurs
    const avgLength = values.reduce((sum, val) => sum + String(val).length, 0) / values.length;
    
    // Compter combien de valeurs semblent être des URIs complètes
    const longUriCount = values.filter(val => {
      const str = String(val);
      return str.length > 50 && (str.startsWith('http://') || str.startsWith('https://'));
    }).length;
    
    const longUriRatio = longUriCount / values.length;
    
    // Le champ est considéré comme lisible si :
    // - Longueur moyenne raisonnable (< 30 caractères)
    // - Moins de 50% d'URIs longues
    return avgLength < 30 && longUriRatio < 0.5;
  }


}

// Enregistrer le composant
customElements.define('vis-graph', VisGraph); 