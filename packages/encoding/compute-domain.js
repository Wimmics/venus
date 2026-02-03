/**
 * Calculateur de domaines pour l'encoding visuel des graphes de connaissances.
 * Cette classe analyse les données pour générer automatiquement les domaines
 * appropriés selon les besoins de l'utilisateur et la nature des données.
 */
export class DomainCalculator {
  constructor() {
    // Cache pour les domaines calculés par champ
    this.domainCache = new Map();
    // Cache pour les statistiques des champs
    this.fieldStatsCache = new Map();
    
    // Logging configuration - set to false to show only warnings and errors
    this.enableDebugLogs = false;
  }

  /**
   * Centralized logging methods for consistent output
   */
  _logDebug(message, ...args) {
    if (this.enableDebugLogs) {
      console.log(`%c[DomainCalculator] ${message}`, 'color:rgb(34, 255, 214)', ...args);
    }
  }

  _logInfo(message, ...args) {
    if (this.enableDebugLogs) {
      console.info(`%c[DomainCalculator] ${message}`, 'color: #2196F3', ...args);
    }
  }

  _logWarn(message, ...args) {
    console.warn(`%c[DomainCalculator] WARNING: ${message}`, 'color: #FF9800; font-weight: bold', ...args);
  }

  _logError(message, ...args) {
    console.error(`%c[DomainCalculator] ERROR: ${message}`, 'color: #F44336; font-weight: bold', ...args);
  }

  /**
   * Méthode principale pour obtenir le domaine d'un champ.
   * Gère automatiquement les 3 cas : aucune donnée, données erronées, données incomplètes.
   * 
   * @param {Array} data - Les données du graphe (nodes ou links)
   * @param {string} field - Le nom du champ à analyser
   * @param {Array|null} userDomain - Le domaine fourni par l'utilisateur (peut être null/undefined)
   * @param {string} scaleType - Le type d'échelle ('ordinal', 'linear', 'sqrt', 'log')
   * @returns {Array} Le domaine calculé pour ce champ
   */
  getDomain(data, field, userDomain = null, scaleType = 'ordinal') {
    if (!data || data.length === 0) {
      this._logWarn(`No data available for field "${field}"`);
      return [];
    }

    // Extraire les valeurs existantes du champ dans les données
    const extractedValues = this.getVal(data, field);
    
    if (extractedValues.length === 0) {
      this._logWarn(`No values found in data for field "${field}"`);
      return [];
    }

    this._logDebug(`Field analysis "${field}": ${extractedValues.length} unique values found`);
    this._logDebug(`Values extracted from data:`, extractedValues);
    this._logDebug(`User domain provided:`, userDomain);

    // Cas 1: Pas de domaine utilisateur -> utiliser les valeurs extraites
    if (!userDomain || userDomain.length === 0) {
      const reason = !userDomain ? "user domain not defined (null/undefined)" : "user domain empty (empty array)";
      this._logDebug(`Case 1: Automatic domain generation - Reason: ${reason}`);
      this._logDebug(`Automatic generation based on ${extractedValues.length} data values`);
      
      const sortedDomain = this.sortDomainValues(extractedValues, scaleType);
      
      // Informational warning for user awareness
      this._logWarn(`No domain provided by user for field "${field}". Domain automatically generated (${extractedValues.length} unique values): [${sortedDomain.join(', ')}]. To customize the domain, provide a "domain" array in your scale configuration.`);
      
      this._logDebug(`Domain generated (${scaleType}):`, sortedDomain);
      return sortedDomain;
    }

    // Cas 2: Domaine utilisateur erroné -> le corriger
    const invalidityReport = this.analyzeDomainInvalidity(userDomain, extractedValues);
    if (invalidityReport.isInvalid) {
      const fixedDomain = this.fixDomain(userDomain, extractedValues, scaleType);
      
      // Regrouper tous les détails en un seul warning consolidé
      const warningParts = [
        `Invalid domain for field "${field}": ${invalidityReport.reason}`,
        `User provided: [${userDomain.join(', ')}]`,
        `Data contains: [${extractedValues.join(', ')}]`,
        `Domain corrected to: [${fixedDomain.join(', ')}]`
      ];
      this._logWarn(warningParts.join(' | '));
      
      this._logDebug(`Domain corrected:`, fixedDomain);
      return fixedDomain;
    }

    // Cas 3: Domaine utilisateur incomplet -> le compléter
    const incompletenessReport = this.analyzeDomainIncompleteness(userDomain, extractedValues);
    if (incompletenessReport.isIncomplete) {
      const completedDomain = this.completeDomain(userDomain, extractedValues, scaleType);
      
      // Regrouper tous les détails en un seul warning consolidé
      const warningParts = [
        `Incomplete domain for field "${field}": Missing ${incompletenessReport.missingValues.length} values (coverage: ${Math.round(incompletenessReport.coverage * 100)}%)`,
        `User provided: [${userDomain.join(', ')}]`,
        `Missing values: [${incompletenessReport.missingValues.join(', ')}]`,
        `Domain completed to: [${completedDomain.join(', ')}]`
      ];
      this._logWarn(warningParts.join(' | '));
      
      this._logDebug(`Domain completed (${userDomain.length} → ${completedDomain.length} values):`, completedDomain);
      return completedDomain;
    }

    // Cas 4: Domaine utilisateur valide -> le conserver tel quel
    this._logDebug(`Valid user domain, keeping as is`);
    this._logDebug(`All user domain values match the data`);
    this._logDebug(`Domain preserved:`, userDomain);
    return [...userDomain]; // Copie pour éviter les modifications externes
  }

  /**
   * Extrait toutes les valeurs uniques d'un champ depuis les données brutes.
   * Travaille uniquement avec les données issues directement des requêtes SPARQL.
   * 
   * @param {Array} data - Les données brutes à analyser
   * @param {string} field - Le nom du champ
   * @returns {Array} Les valeurs uniques trouvées
   */
  getVal(data, field) {
    const values = new Set();
    
    data.forEach((item, index) => {
      // Extraction directe du champ depuis les données brutes
      const value = item[field];
      
      if (value !== null && value !== undefined && value !== '') {
        values.add(value);
      }
    });
    
    const result = Array.from(values);
    
    // Mettre en cache les statistiques
    this.cacheFieldStats(field, result, data.length);
    
    return result;
  }

  /**
   * Trie les valeurs du domaine selon le type d'échelle.
   * 
   * @param {Array} values - Les valeurs à trier
   * @param {string} scaleType - Le type d'échelle
   * @returns {Array} Les valeurs triées
   */
  sortDomainValues(values, scaleType) {
    if (scaleType === 'ordinal') {
      // Pour les échelles ordinales, tri alphanumérique
      return [...values].sort((a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
          return a.localeCompare(b, 'fr', { numeric: true });
        }
        return String(a).localeCompare(String(b), 'fr', { numeric: true });
      });
    } else {
      // Pour les échelles numériques, tri numérique
      return [...values].sort((a, b) => {
        const numA = this.convertToNumber(a);
        const numB = this.convertToNumber(b);
        return numA - numB;
      });
    }
  }

  /**
   * Analyse en détail la validité d'un domaine utilisateur.
   * 
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @returns {Object} Rapport détaillé de validité
   */
  analyzeDomainInvalidity(userDomain, extractedValues) {
    if (!Array.isArray(userDomain)) {
      return {
        isInvalid: true,
        reason: "User domain is not an array",
        invalidValues: [userDomain],
        validValues: [],
        totalUserValues: userDomain ? 1 : 0
      };
    }

    const validValues = [];
    const invalidValues = [];

    userDomain.forEach(domainValue => {
      const isValid = extractedValues.some(dataValue => this.valuesAreEqual(domainValue, dataValue));
      if (isValid) {
        validValues.push(domainValue);
      } else {
        invalidValues.push(domainValue);
      }
    });

    const isInvalid = validValues.length === 0;
    
    let reason = "";
    if (isInvalid) {
      if (invalidValues.length === userDomain.length) {
        reason = "No values in user domain match the data";
      } else {
        reason = `${invalidValues.length}/${userDomain.length} values in user domain do not match the data`;
      }
    }

    return {
      isInvalid,
      reason,
      invalidValues,
      validValues,
      totalUserValues: userDomain.length,
      validityRate: validValues.length / userDomain.length
    };
  }

  /**
   * Analyse en détail la complétude d'un domaine utilisateur.
   * 
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @returns {Object} Rapport détaillé de complétude
   */
  analyzeDomainIncompleteness(userDomain, extractedValues) {
    if (!Array.isArray(userDomain)) {
      return {
        isIncomplete: false,
        missingValues: [],
        existingValues: [],
        coverage: 0
      };
    }

    const existingValues = [];
    const missingValues = [];

    extractedValues.forEach(dataValue => {
      const exists = userDomain.some(domainValue => this.valuesAreEqual(domainValue, dataValue));
      if (exists) {
        existingValues.push(dataValue);
      } else {
        missingValues.push(dataValue);
      }
    });

    const coverage = existingValues.length / extractedValues.length;
    const isIncomplete = missingValues.length > 0;

    return {
      isIncomplete,
      missingValues,
      existingValues,
      coverage,
      totalDataValues: extractedValues.length,
      missingCount: missingValues.length
    };
  }

  /**
   * Vérifie si le domaine utilisateur est invalide par rapport aux données.
   * 
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @returns {boolean} True si le domaine est invalide
   */
  isDomainInvalid(userDomain, extractedValues) {
    const report = this.analyzeDomainInvalidity(userDomain, extractedValues);
    return report.isInvalid;
  }

  /**
   * Vérifie si le domaine utilisateur est incomplet.
   * 
   * @param {Array} userDomain - Le domaine fourni par l'utilisateur
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @returns {boolean} True si le domaine est incomplet
   */
  isDomainIncomplete(userDomain, extractedValues) {
    const report = this.analyzeDomainIncompleteness(userDomain, extractedValues);
    return report.isIncomplete;
  }

  /**
   * Corrige un domaine invalide en utilisant les valeurs des données.
   * 
   * @param {Array} invalidDomain - Le domaine invalide
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @param {string} scaleType - Le type d'échelle
   * @returns {Array} Le domaine corrigé
   */
  fixDomain(invalidDomain, extractedValues, scaleType) {
    this._logDebug(`Correcting invalid domain...`);
    this._logDebug(`Invalid domain:`, invalidDomain);
    this._logDebug(`Available data:`, extractedValues);
    this._logDebug(`Complete replacement with data values`);
    
    // Pour un domaine complètement invalide, utiliser toutes les valeurs des données
    const sortedDomain = this.sortDomainValues(extractedValues, scaleType);
    
    this._logDebug(`Domain corrected (sorting ${scaleType}):`, sortedDomain);
    this._logDebug(`Change: ${invalidDomain.length} → ${sortedDomain.length} values`);
    
    return sortedDomain;
  }

  /**
   * Complète un domaine incomplet en préservant l'ordre de l'utilisateur.
   * 
   * @param {Array} incompleteDomain - Le domaine incomplet
   * @param {Array} extractedValues - Les valeurs extraites des données
   * @param {string} scaleType - Le type d'échelle
   * @returns {Array} Le domaine complété
   */
  completeDomain(incompleteDomain, extractedValues, scaleType) {
    this._logDebug(`Completing incomplete domain...`);
    this._logDebug(`User domain:`, incompleteDomain);
    
    // Garder l'ordre de l'utilisateur pour les valeurs qu'il a spécifiées
    const completedDomain = [...incompleteDomain];
    
    // Ajouter les valeurs manquantes
    const missingValues = extractedValues.filter(dataValue => 
      !incompleteDomain.some(domainValue => this.valuesAreEqual(domainValue, dataValue))
    );
    
    this._logDebug(`Missing values detected:`, missingValues);
    
    // Trier les valeurs manquantes selon le type d'échelle
    const sortedMissingValues = this.sortDomainValues(missingValues, scaleType);
    
    this._logDebug(`Missing values sorted (${scaleType}):`, sortedMissingValues);
    this._logDebug(`Adding missing values to end of user domain`);
    
    // Les ajouter à la fin du domaine utilisateur
    completedDomain.push(...sortedMissingValues);
    
    this._logDebug(`Domain completed:`, completedDomain);
    this._logDebug(`Change: ${incompleteDomain.length} → ${completedDomain.length} values`);
    this._logDebug(`Preservation: user order maintained for first ${incompleteDomain.length} values`);
    
    return completedDomain;
  }

  /**
   * Compare deux valeurs pour déterminer si elles sont équivalentes.
   * Gère les comparaisons de types différents (string/number).
   * 
   * @param {*} value1 - Première valeur
   * @param {*} value2 - Deuxième valeur
   * @returns {boolean} True si les valeurs sont équivalentes
   */
  valuesAreEqual(value1, value2) {
    // Comparaison directe
    if (value1 === value2) return true;
    
    // Comparaison après conversion en string (pour gérer "1" vs 1)
    if (String(value1) === String(value2)) return true;
    
    // Comparaison numérique si les deux valeurs peuvent être converties
    const num1 = this.convertToNumber(value1);
    const num2 = this.convertToNumber(value2);
    if (!isNaN(num1) && !isNaN(num2) && num1 === num2) return true;
    
    return false;
  }

  /**
   * Convertit une valeur en nombre si possible.
   * 
   * @param {*} value - La valeur à convertir
   * @returns {number} Le nombre ou NaN si impossible
   */
  convertToNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? NaN : num;
    }
    return NaN;
  }

  /**
   * Met en cache les statistiques d'un champ pour optimiser les calculs futurs.
   * 
   * @param {string} field - Le nom du champ
   * @param {Array} uniqueValues - Les valeurs uniques trouvées
   * @param {number} totalCount - Le nombre total d'éléments dans les données
   */
  cacheFieldStats(field, uniqueValues, totalCount) {
    const stats = {
      uniqueValues: [...uniqueValues],
      uniqueCount: uniqueValues.length,
      totalCount: totalCount,
      coverage: uniqueValues.length / totalCount,
      lastUpdated: Date.now()
    };
    
    this.fieldStatsCache.set(field, stats);
  }

  /**
   * Récupère les statistiques d'un champ depuis le cache.
   * 
   * @param {string} field - Le nom du champ
   * @returns {Object|null} Les statistiques ou null si non trouvées
   */
  getFieldStats(field) {
    return this.fieldStatsCache.get(field) || null;
  }

  /**
   * Vide le cache pour forcer le recalcul lors de la prochaine utilisation.
   */
  clearCache() {
    this.domainCache.clear();
    this.fieldStatsCache.clear();
  }

  /**
   * Génère un domaine suggéré pour un champ numérique basé sur les statistiques.
   * Utile pour les échelles linéaires, sqrt, log.
   * 
   * @param {Array} data - Les données à analyser
   * @param {string} field - Le nom du champ numérique
   * @param {number} steps - Le nombre de pas suggérés (défaut: 5)
   * @returns {Array} Le domaine numérique suggéré
   */
  generateNumericDomain(data, field, steps = 5) {
    const values = this.getVal(data, field)
      .map(v => this.convertToNumber(v))
      .filter(v => !isNaN(v));
    
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const step = (max - min) / (steps - 1);
    
    const domain = [];
    for (let i = 0; i < steps; i++) {
      domain.push(min + (step * i));
    }
    
    return domain;
  }

  /**
   * Analyse la nature d'un champ pour suggérer le type d'échelle approprié.
   * 
   * @param {Array} data - Les données à analyser
   * @param {string} field - Le nom du champ
   * @returns {Object} Analyse avec type suggéré et statistiques
   */
  analyzeFieldType(data, field) {
    const values = this.getVal(data, field);
    if (values.length === 0) {
      return {
        suggestedScale: 'ordinal',
        isNumeric: false,
        uniqueCount: 0,
        samples: []
      };
    }
    
    // Tester si toutes les valeurs sont numériques
    const numericValues = values.map(v => this.convertToNumber(v)).filter(v => !isNaN(v));
    const isNumeric = numericValues.length === values.length;
    
    // Calculer des statistiques
    const uniqueCount = values.length;
    const samples = values.slice(0, 5); // Échantillon pour aperçu
    
    // Suggérer le type d'échelle
    let suggestedScale = 'ordinal';
    if (isNumeric) {
      if (uniqueCount <= 10) {
        suggestedScale = 'ordinal'; // Peu de valeurs numériques -> ordinal
      } else {
        suggestedScale = 'linear'; // Beaucoup de valeurs numériques -> linéaire
      }
    }
    
    return {
      suggestedScale,
      isNumeric,
      uniqueCount,
      samples,
      coverage: uniqueCount / data.length
    };
  }
} 