/**
 * Calculateur de domaines pour l'encoding visuel des graphes de connaissances.
 * Cette classe analyse les données pour générer automatiquement les domaines
 * appropriés selon les besoins de l'utilisateur et la nature des données.
 */
import { createLogger } from "@wimmics/kgnovis-core";

export class DomainCalculator {
  constructor() {
    // Cache pour les domaines calculés par champ
    this.domainCache = new Map();
    // Cache pour les statistiques des champs
    this.fieldStatsCache = new Map();
    
    this.logger = createLogger("DomainCalculator", { debug: false, level: "warn" });
    this.maxLogMessageLength = 420;
    this.maxListedValuesInWarnings = 12;
  }

  _truncateLogMessage(message) {
    const text = typeof message === 'string' ? message : String(message);
    if (text.length <= this.maxLogMessageLength) return text;
    const truncatedChars = text.length - this.maxLogMessageLength;
    return `${text.slice(0, this.maxLogMessageLength)}... [${truncatedChars} chars truncated]`;
  }

  _formatValueList(values) {
    if (!Array.isArray(values) || values.length === 0) {
      return '';
    }
    const shownValues = values.slice(0, this.maxListedValuesInWarnings).map(v => String(v));
    const remainingCount = values.length - shownValues.length;
    return remainingCount > 0
      ? `${shownValues.join(', ')}, ... (+${remainingCount} more)`
      : shownValues.join(', ');
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
      this.logger.warn(this._truncateLogMessage(`No data available for field "${field}"`));
      return [];
    }

    // Extraire les valeurs existantes du champ dans les données
    const extractedValues = this.getVal(data, field);
    
    if (extractedValues.length === 0) {
      this.logger.warn(this._truncateLogMessage(`No values found in data for field "${field}"`));
      return [];
    }

    // Quantitative scales use continuous numeric domains (min/max), not categorical membership checks.
    if (this._isQuantitativeScale(scaleType)) {
      return this._getQuantitativeDomain(extractedValues, field, userDomain, scaleType);
    }

    this.logger.debug(this._truncateLogMessage(`Field analysis "${field}": ${extractedValues.length} unique values found`));
    this.logger.debug(this._truncateLogMessage(`Values extracted from data:`), extractedValues);
    this.logger.debug(this._truncateLogMessage(`User domain provided:`), userDomain);

    // Cas 1: Pas de domaine utilisateur -> utiliser les valeurs extraites
    if (!userDomain || userDomain.length === 0) {
      const reason = !userDomain ? "user domain not defined (null/undefined)" : "user domain empty (empty array)";
      this.logger.debug(this._truncateLogMessage(`Case 1: Automatic domain generation - Reason: ${reason}`));
      this.logger.debug(this._truncateLogMessage(`Automatic generation based on ${extractedValues.length} data values`));
      
      const sortedDomain = this.sortDomainValues(extractedValues, scaleType);
      
      // Informational warning for user awareness
      this.logger.warn(this._truncateLogMessage(`No domain provided by user for field "${field}". Domain automatically generated (${extractedValues.length} unique values): [${this._formatValueList(sortedDomain)}]. To customize the domain, provide a "domain" array in your scale configuration.`));
      
      this.logger.debug(this._truncateLogMessage(`Domain generated (${scaleType}):`), sortedDomain);
      return sortedDomain;
    }

    // Cas 2: Domaine utilisateur erroné -> le corriger
    const invalidityReport = this.analyzeDomainInvalidity(userDomain, extractedValues);
    if (invalidityReport.isInvalid) {
      const fixedDomain = this.fixDomain(userDomain, extractedValues, scaleType);
      
      // Regrouper tous les détails en un seul warning consolidé
      const warningParts = [
        `Invalid domain for field "${field}": ${invalidityReport.reason}`,
        `User provided: [${this._formatValueList(userDomain)}]`,
        `Data contains: [${this._formatValueList(extractedValues)}]`,
        `Domain corrected to: [${this._formatValueList(fixedDomain)}]`
      ];
      this.logger.warn(this._truncateLogMessage(warningParts.join(' | ')));
      
      this.logger.debug(this._truncateLogMessage(`Domain corrected:`), fixedDomain);
      return fixedDomain;
    }

    // Cas 3: Domaine utilisateur incomplet -> le compléter
    const incompletenessReport = this.analyzeDomainIncompleteness(userDomain, extractedValues);
    if (incompletenessReport.isIncomplete) {
      const completedDomain = this.completeDomain(userDomain, extractedValues, scaleType);
      
      // Regrouper tous les détails en un seul warning consolidé
      const warningParts = [
        `Incomplete domain for field "${field}": Missing ${incompletenessReport.missingValues.length} values (coverage: ${Math.round(incompletenessReport.coverage * 100)}%)`,
        `User provided: [${this._formatValueList(userDomain)}]`,
        `Missing values: [${this._formatValueList(incompletenessReport.missingValues)}]`,
        `Domain completed to: [${this._formatValueList(completedDomain)}]`
      ];
      this.logger.warn(this._truncateLogMessage(warningParts.join(' | ')));
      
      this.logger.debug(this._truncateLogMessage(`Domain completed (${userDomain.length} → ${completedDomain.length} values):`), completedDomain);
      return completedDomain;
    }

    // Cas 4: Domaine utilisateur valide -> le conserver tel quel
    this.logger.debug(this._truncateLogMessage(`Valid user domain, keeping as is`));
    this.logger.debug(this._truncateLogMessage(`All user domain values match the data`));
    this.logger.debug(this._truncateLogMessage(`Domain preserved:`), userDomain);
    return [...userDomain]; // Copie pour éviter les modifications externes
  }

  _isQuantitativeScale(scaleType) {
    return scaleType === 'linear' || scaleType === 'sqrt' || scaleType === 'log' || scaleType === 'quantitative' || scaleType === 'sequential';
  }

  _getQuantitativeDomain(extractedValues, field, userDomain, scaleType) {
    const numericValues = extractedValues
      .map(v => this.convertToNumber(v))
      .filter(v => !isNaN(v));

    if (numericValues.length === 0) {
      this.logger.warn(this._truncateLogMessage(`No numeric values found in data for field "${field}"`));
      return [];
    }

    const dataMin = Math.min(...numericValues);
    const dataMax = Math.max(...numericValues);
    const autoDomain = [dataMin, dataMax];

    if (!Array.isArray(userDomain) || userDomain.length < 2) {
      this.logger.warn(this._truncateLogMessage(`No valid numeric domain provided by user for field "${field}". Domain automatically generated from data extent: [${this._formatValueList(autoDomain)}].`));
      return autoDomain;
    }

    const userNumericValues = userDomain
      .map(v => this.convertToNumber(v))
      .filter(v => !isNaN(v));

    if (userNumericValues.length < 2) {
      this.logger.warn(this._truncateLogMessage(`Invalid numeric domain for field "${field}". User provided: [${this._formatValueList(userDomain)}]. Domain automatically generated from data extent: [${this._formatValueList(autoDomain)}].`));
      return autoDomain;
    }

    const userMin = Math.min(...userNumericValues);
    const userMax = Math.max(...userNumericValues);
    let finalDomain = [userMin, userMax];

    if (scaleType === 'log' && (finalDomain[0] <= 0 || finalDomain[1] <= 0)) {
      const positiveValues = numericValues.filter(v => v > 0);
      if (positiveValues.length < 2) {
        this.logger.warn(this._truncateLogMessage(`Log scale requires positive values for field "${field}". Falling back to [1, 10].`));
        return [1, 10];
      }
      finalDomain = [Math.min(...positiveValues), Math.max(...positiveValues)];
      this.logger.warn(this._truncateLogMessage(`Invalid non-positive user domain for log scale on field "${field}". Domain corrected to positive data extent: [${this._formatValueList(finalDomain)}].`));
    }

    if (finalDomain[0] === finalDomain[1]) {
      finalDomain = [finalDomain[0], finalDomain[0] + 1];
      this.logger.warn(this._truncateLogMessage(`Degenerate numeric domain for field "${field}" (min=max). Domain expanded to: [${this._formatValueList(finalDomain)}].`));
    }

    return finalDomain;
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
    this.logger.debug(this._truncateLogMessage(`Correcting invalid domain...`));
    this.logger.debug(this._truncateLogMessage(`Invalid domain:`), invalidDomain);
    this.logger.debug(this._truncateLogMessage(`Available data:`), extractedValues);
    this.logger.debug(this._truncateLogMessage(`Complete replacement with data values`));
    
    // Pour un domaine complètement invalide, utiliser toutes les valeurs des données
    const sortedDomain = this.sortDomainValues(extractedValues, scaleType);
    
    this.logger.debug(this._truncateLogMessage(`Domain corrected (sorting ${scaleType}):`), sortedDomain);
    this.logger.debug(this._truncateLogMessage(`Change: ${invalidDomain.length} → ${sortedDomain.length} values`));
    
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
    this.logger.debug(this._truncateLogMessage(`Completing incomplete domain...`));
    this.logger.debug(this._truncateLogMessage(`User domain:`), incompleteDomain);
    
    // Garder l'ordre de l'utilisateur pour les valeurs qu'il a spécifiées
    const completedDomain = [...incompleteDomain];
    
    // Ajouter les valeurs manquantes
    const missingValues = extractedValues.filter(dataValue => 
      !incompleteDomain.some(domainValue => this.valuesAreEqual(domainValue, dataValue))
    );
    
    this.logger.debug(this._truncateLogMessage(`Missing values detected:`), missingValues);
    
    // Trier les valeurs manquantes selon le type d'échelle
    const sortedMissingValues = this.sortDomainValues(missingValues, scaleType);
    
    this.logger.debug(this._truncateLogMessage(`Missing values sorted (${scaleType}):`), sortedMissingValues);
    this.logger.debug(this._truncateLogMessage(`Adding missing values to end of user domain`));
    
    // Les ajouter à la fin du domaine utilisateur
    completedDomain.push(...sortedMissingValues);
    
    this.logger.debug(this._truncateLogMessage(`Domain completed:`), completedDomain);
    this.logger.debug(this._truncateLogMessage(`Change: ${incompleteDomain.length} → ${completedDomain.length} values`));
    this.logger.debug(this._truncateLogMessage(`Preservation: user order maintained for first ${incompleteDomain.length} values`));
    
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
