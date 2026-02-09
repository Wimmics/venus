import * as d3 from "d3";
import * as d3Chromatic from "d3-scale-chromatic";
import { createLogger } from "@wimmics/kgnovis-core";

// Import de D3 depuis CDN
//import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/**
 * Calculateur de palettes de couleurs pour l'encoding visuel des graphes de connaissances.
 * Parse les ranges de type string (ex: "Blues", "Blues[5]") vers les schémas D3 appropriés.
 * Compatible avec les types ordinal et quantitative.
 */
export class ColorScaleCalculator {
  constructor() {
    // Cache pour les échelles générées
    this.scaleCache = new Map();
    
    // Cache pour éviter les warnings répétés
    this.warningCache = new Set();
    
    this.logger = createLogger("ColorScaleCalculator", { debug: false, level: "warn" });
  }

  /**
   * Valide si une couleur est reconnue (hex, rgb, rgba, hsl, hsla, noms CSS standard)
   * @param {string} color - Couleur à valider
   * @returns {boolean} True si la couleur est valide
   */
  isValidColor(color) {
    if (typeof color !== 'string') return false;
    
    // Nettoyer la couleur (supprimer espaces)
    color = color.trim();
    
    // Valider couleurs hex (#rgb, #rrggbb)
    const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
    if (hexPattern.test(color)) return true;
    
    // Valider couleurs RGB/RGBA
    const rgbPattern = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([01]|0?\.\d+))?\s*\)$/;
    const rgbMatch = color.match(rgbPattern);
    if (rgbMatch) {
      const [, r, g, b, a] = rgbMatch;
      // Vérifier que les valeurs RGB sont dans la plage 0-255
      if (parseInt(r) <= 255 && parseInt(g) <= 255 && parseInt(b) <= 255) {
        // Si alpha est présent, vérifier qu'il est entre 0 et 1
        if (a === undefined || (parseFloat(a) >= 0 && parseFloat(a) <= 1)) {
          return true;
        }
      }
    }
    
    // Valider couleurs HSL/HSLA
    const hslPattern = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*([01]|0?\.\d+))?\s*\)$/;
    const hslMatch = color.match(hslPattern);
    if (hslMatch) {
      const [, h, s, l, a] = hslMatch;
      // Vérifier les plages HSL
      if (parseInt(h) <= 360 && parseInt(s) <= 100 && parseInt(l) <= 100) {
        // Si alpha est présent, vérifier qu'il est entre 0 et 1
        if (a === undefined || (parseFloat(a) >= 0 && parseFloat(a) <= 1)) {
          return true;
        }
      }
    }
    
    // Valider couleurs CSS nommées courantes
    const cssColors = [
      'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
      'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
      'maroon', 'olive', 'teal', 'silver', 'aqua', 'fuchsia', 'indigo',
      'violet', 'gold', 'coral', 'salmon', 'khaki', 'crimson', 'chocolate',
      'darkred', 'darkgreen', 'darkblue', 'darkorange', 'darkgray', 'darkgrey',
      'lightred', 'lightgreen', 'lightblue', 'lightyellow', 'lightgray', 'lightgrey',
      'steelblue', 'royalblue', 'forestgreen', 'orangered', 'tomato', 'dodgerblue'
    ];
    
    return cssColors.includes(color.toLowerCase());
  }

  /**
   * Convertit un composant RGB en hexadécimal
   * @param {number} c - Composant RGB (0-255)
   * @returns {string} Hexadécimal à 2 caractères
   */
  componentToHex(c) {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  /**
   * Convertit RGB en couleur hexadécimale
   * @param {number} r - Rouge (0-255)
   * @param {number} g - Vert (0-255)
   * @param {number} b - Bleu (0-255)
   * @returns {string} Couleur hexadécimale
   */
  rgbToHex(r, g, b) {
    return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
  }

  /**
   * Convertit une couleur hexadécimale en RGB
   * @param {string} hex - Couleur hexadécimale
   * @returns {string} Format rgb(r, g, b)
   */
  hexToRgb(hex) {
    // Supprimer le "#" si présent
    hex = hex.replace(/^#/, '');

    // Convertir de la forme courte (3 caractères) à la forme complète (6 caractères)
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    // Convertir en valeurs RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Parse un nom de schéma D3 avec support des indices (ex: "Blues[5]")
   * @param {string} input - Nom du schéma (ex: "Blues", "Blues[5]", "Category10")
   * @param {string} scaleType - Type d'échelle ('ordinal' ou 'quantitative')
   * @returns {object|null} {type: "interpolate"|"scheme", value: function|array, raw: string}
   */
  parseD3ColorScheme(input, scaleType = 'ordinal') {
    const regex = /^([a-zA-Z0-9]+)(?:\[(\d+)\])?$/;
    const match = input.match(regex);

    if (!match) return null;

    const rawName = match[1];
    const index = match[2] ? parseInt(match[2], 10) : null;

    // Essayer plusieurs variations de normalisation
    const variations = [
      // Première lettre majuscule + reste minuscule (ex: viridis → Viridis)
      rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase(),
      // Tout en majuscule (ex: viridis → VIRIDIS)  
      rawName.toUpperCase(),
      // Exactement comme fourni (ex: Viridis → Viridis)
      rawName,
      // Tout en minuscule (ex: VIRIDIS → viridis)
      rawName.toLowerCase()
    ];

    this.logger.debug(`Attempting to parse: "${input}" (type: ${scaleType})`);
    this.logger.debug(`Tested variations: ${variations.join(', ')}`);

    for (const normalizedName of variations) {
      if (scaleType === 'quantitative' || scaleType === 'sequential') {
        // Pour quantitative : utiliser interpolate
        const fullInterpolate = `interpolate${normalizedName}`;
        this.logger.debug(`Testing interpolate: ${fullInterpolate}`);
        
        // Check d3 first, then d3Chromatic
        if (fullInterpolate in d3 && typeof d3[fullInterpolate] === "function") {
          this.logger.debug(`Found in d3: ${fullInterpolate}`);
          return {
            type: "interpolate",
            value: d3[fullInterpolate],
            raw: rawName,
          };
        }
        if (fullInterpolate in d3Chromatic && typeof d3Chromatic[fullInterpolate] === "function") {
          this.logger.debug(`Found in d3Chromatic: ${fullInterpolate}`);
          return {
            type: "interpolate",
            value: d3Chromatic[fullInterpolate],
            raw: rawName,
          };
        }
      } else {
        // Pour ordinal : utiliser scheme
        const fullScheme = `scheme${normalizedName}`;
        this.logger.debug(`Testing scheme: ${fullScheme}`);
        
        // Check d3 first, then d3Chromatic
        let scheme = null;
        let source = null;
        
        if (fullScheme in d3) {
          scheme = d3[fullScheme];
          source = 'd3';
        } else if (fullScheme in d3Chromatic) {
          scheme = d3Chromatic[fullScheme];
          source = 'd3Chromatic';
        }
        
        if (scheme) {
          this.logger.debug(`Found in ${source}: ${fullScheme}`);

          // If the scheme is an array, it can be either:
          // - a nested array (array of arrays) where each entry is a palette for a given size
          // - a flat array of color strings (a single palette)
          if (Array.isArray(scheme)) {
            // Nested array (e.g. schemeBlues where scheme[5] is an array of 5 colors)
            if (Array.isArray(scheme[0])) {
              if (index !== null && scheme[index]) {
                return { type: "scheme", value: scheme[index], raw: rawName };
              }
              const maxIndex = scheme.length - 1;
              return { type: "scheme", value: scheme[maxIndex], raw: rawName };
            }

            // Flat array (e.g. schemeSet1) — return the palette itself
            return { type: "scheme", value: scheme, raw: rawName };
          }
        }
      }
    }

    {
      const warningMessage = `D3 color scheme "${input}" not found for type "${scaleType}". See available schemes at: https://d3js.org/d3-scale-chromatic`;
      const warningKey = warningMessage;
      if (!this.warningCache.has(warningKey)) {
        this.logger.warn(warningMessage);
        this.warningCache.add(warningKey);
      }
    }
    return null;
  }

  /**
   * Obtient le meilleur fallback selon le type d'échelle et la taille du domaine
   * @param {string} scaleType - Type d'échelle ('ordinal' ou 'quantitative')
   * @param {number} domainSize - Taille du domaine
   * @returns {*} Meilleur fallback (scheme array ou interpolator function)
   */
  getBestFallback(scaleType, domainSize) {
    if (scaleType === 'quantitative' || scaleType === 'sequential') {
      // Pour quantitative : utiliser des interpolateurs perceptuels
      return d3.interpolateViridis; // Meilleur que Turbo pour la perception
    } else {
      // Pour ordinal : utiliser des palettes catégorielles optimisées
      if (domainSize <= 10) {
        return d3.schemeCategory10; // Palette optimale jusqu'à 10 catégories
      } else if (domainSize <= 12) {
        return d3.schemeSet3; // Palette plus claire pour plus de catégories
      } else {
        // Pour beaucoup de catégories, générer depuis un interpolateur valide
        return d3.quantize(d3.interpolateViridis, domainSize);
      }
    }
  }

  /**
   * Méthode principale pour créer une échelle de couleurs
   * Travaille uniquement avec le domaine fourni (calculé par DomainCalculator)
   * et se concentre sur le calcul du range pour générer l'échelle de couleur.
   * 
   * @param {object} config - Configuration {domain, range, scaleType, fallbackInterpolator, label}
   * @returns {Function} Fonction d'échelle de couleur D3 (ex: d3.scaleOrdinal().domain(...).range(...))
   */
  createColorScale({ 
    domain, 
    range, 
    scaleType = 'ordinal',
    fallbackInterpolator = null,
    label = "Color" 
  }) {
    // Validation du domaine fourni
    if (!Array.isArray(domain) || domain.length === 0) {
      {
        const warningMessage = `Invalid or empty domain provided (${label}). Cannot create color scale.`;
        const warningKey = warningMessage;
        if (!this.warningCache.has(warningKey)) {
          this.logger.warn(warningMessage);
          this.warningCache.add(warningKey);
        }
      }
      return null;
    }

    this.logger.debug(`Creating color scale (${label}) with domain:`, domain);
    this.logger.debug(`Scale type: ${scaleType}, Range input:`, range);

    // Obtenir le meilleur fallback si pas spécifié
    const smartFallback = fallbackInterpolator || this.getBestFallback(scaleType, domain.length);
    this.logger.debug(`Smart fallback chosen (${label}):`, typeof smartFallback === 'function' ? smartFallback.name : smartFallback);
    
    // Calculer le range final à partir de l'input utilisateur
    let finalRange = this._computeColorRange(range, scaleType, domain.length, smartFallback, label);

    // Validation finale du range
    if (!Array.isArray(finalRange) || finalRange.length === 0) {
      {
        const warningMessage = `Could not compute valid color range (${label}). Using smart fallback.`;
        const warningKey = warningMessage;
        if (!this.warningCache.has(warningKey)) {
          this.logger.warn(warningMessage);
          this.warningCache.add(warningKey);
        }
      }
      finalRange = this._getFallbackRange(smartFallback, domain.length);
    }

    // Avertissements sur les tailles
    if (finalRange.length < domain.length) {
      {
        const warningMessage = `Color range shorter than domain (${label}): ${finalRange.length} < ${domain.length}. Colors will repeat.`;
        const warningKey = warningMessage;
        if (!this.warningCache.has(warningKey)) {
          this.logger.warn(warningMessage);
          this.warningCache.add(warningKey);
        }
      }
    } else if (finalRange.length > domain.length) {
      {
        const warningMessage = `Color range longer than domain (${label}): ${finalRange.length} > ${domain.length}. Extra colors ignored.`;
        const warningKey = warningMessage;
        if (!this.warningCache.has(warningKey)) {
          this.logger.warn(warningMessage);
          this.warningCache.add(warningKey);
        }
      }
    }

    // Création de l'échelle selon le type
    return this._createD3Scale(domain, finalRange, scaleType, range, label);
  }

  /**
   * Calcule le range de couleurs à partir de l'input utilisateur
   * @private
   */
  _computeColorRange(range, scaleType, domainLength, smartFallback, label) {
    // Cas 1: Pas de range spécifié → utiliser le fallback intelligent
    if (range === null || range === undefined) {
      this.logger.debug(`No range specified (${label}), using smart fallback`);
      return this._getFallbackRange(smartFallback, domainLength);
    }

    // Cas 2: Range de type string (nom de palette D3)
    if (typeof range === 'string') {
      return this._parseStringRange(range, scaleType, domainLength, smartFallback, label);
    }

    // Cas 3: Range de type array (couleurs explicites)
    if (Array.isArray(range)) {
      return this._parseArrayRange(range, scaleType, domainLength, smartFallback, label);
    }

    // Cas 4: Type de range non supporté
    {
      const warningMessage = `Unsupported range type (${label}): ${typeof range}. Using smart fallback.`;
      const warningKey = warningMessage;
      if (!this.warningCache.has(warningKey)) {
        this.logger.warn(warningMessage);
        this.warningCache.add(warningKey);
      }
    }
    return this._getFallbackRange(smartFallback, domainLength);
  }

  /**
   * Parse un range de type string (palette D3)
   * @private
   */
  _parseStringRange(range, scaleType, domainLength, smartFallback, label) {
    // Treat basic color names/literals as constant color before trying D3 palette names.
    if (this.isValidColor(range)) {
      return Array(domainLength).fill(range);
    }

    const parsed = this.parseD3ColorScheme(range, scaleType);
    
    if (parsed?.type === "interpolate") {
      return d3.quantize(parsed.value, domainLength);
    } else if (parsed?.type === "scheme") {
      return parsed.value;
    } else {
      // Palette non trouvée - utiliser fallback (warning déjà affiché par parseD3ColorScheme)
      this.logger.debug(`String range parsing failed (${label}), using smart fallback`);
      return this._getFallbackRange(smartFallback, domainLength);
    }
  }

  /**
   * Parse un range de type array (couleurs explicites)
   * @private
   */
  _parseArrayRange(range, scaleType, domainLength, smartFallback, label) {
    // Cas spécial: array avec un seul élément string (erreur courante)
    if (range.length === 1 && typeof range[0] === 'string') {
      const potentialSchemeName = range[0];
      const parsed = this.parseD3ColorScheme(potentialSchemeName, scaleType);
      
      if (parsed !== null) {
        const errorMessage = `Unsupported range format: ["${potentialSchemeName}"]. ` +
          `To use a pre-existing palette, use the string directly: "${potentialSchemeName}". ` +
          `Arrays are reserved for explicit hexadecimal colors like ["#1f77b4", "#ff7f0e"].`;
        {
          const warningMessage = errorMessage;
          const warningKey = warningMessage;
          if (!this.warningCache.has(warningKey)) {
            this.logger.warn(warningMessage);
            this.warningCache.add(warningKey);
          }
        }
        
        // Corriger automatiquement en utilisant la version string
        return this._parseStringRange(potentialSchemeName, scaleType, domainLength, smartFallback, label);
      }
    }

    // Validation des couleurs dans l'array
    const validColors = [];
    const invalidColors = [];
    
    range.forEach(color => {
      if (this.isValidColor(color)) {
        validColors.push(color);
      } else {
        invalidColors.push(color);
      }
    });
    
    if (invalidColors.length > 0) {
      {
        const warningMessage = `Invalid colors detected and removed (${label}): [${invalidColors.join(', ')}]. Valid colors kept: [${validColors.join(', ')}]`;
        const warningKey = warningMessage;
        if (!this.warningCache.has(warningKey)) {
          this.logger.warn(warningMessage);
          this.warningCache.add(warningKey);
        }
      }
    }

    if (validColors.length > 0) {
      return validColors;
    } else {
      {
        const warningMessage = `No valid colors found in array range (${label}). Using smart fallback.`;
        const warningKey = warningMessage;
        if (!this.warningCache.has(warningKey)) {
          this.logger.warn(warningMessage);
          this.warningCache.add(warningKey);
        }
      }
      return this._getFallbackRange(smartFallback, domainLength);
    }
  }

  /**
   * Obtient le range de fallback
   * @private
   */
  _getFallbackRange(smartFallback, domainLength) {
    if (typeof smartFallback === 'function') {
      try {
        return d3.quantize(smartFallback, domainLength);
      } catch (error) {
        {
          const warningMessage = `Error with fallback interpolator: ${error.message}. Using Category10.`;
          const warningKey = warningMessage;
          if (!this.warningCache.has(warningKey)) {
            this.logger.warn(warningMessage);
            this.warningCache.add(warningKey);
          }
        }
        return d3.schemeCategory10.slice(0, Math.min(domainLength, 10));
      }
    } else if (Array.isArray(smartFallback)) {
      return smartFallback;
    } else {
      // Dernier recours
      return d3.quantize(d3.interpolateViridis, domainLength);
    }
  }

  /**
   * Crée l'échelle D3 finale
   * @private
   */
  _createD3Scale(domain, finalRange, scaleType, originalRange, label) {
    // Mapping final des couleurs selon la taille du domaine
    const finalColors = domain.map((_, i) => finalRange[i % finalRange.length]);

    // Création de l'échelle selon le type
    let scale;
    
    if (scaleType === 'quantitative' || scaleType === 'sequential') {
      // Pour quantitative, essayer d'utiliser scaleSequential si on a un interpolateur
      if (typeof originalRange === 'string') {
        const parsed = this.parseD3ColorScheme(originalRange, scaleType);
        if (parsed?.type === "interpolate") {
          // Créer une échelle sequential avec interpolateur
          scale = d3.scaleSequential(parsed.value)
            .domain([0, domain.length - 1]);
          
          // Wrapper pour retourner la couleur par index du domaine
          const originalScale = scale;
          scale = (value) => {
            const index = domain.indexOf(value);
            return index !== -1 ? originalScale(index) : originalScale(0);
          };
          scale.domain = () => domain;
          scale.range = () => finalColors;
          
          this.logger.debug(`Sequential scale created (${label}) with interpolator`);
          return scale;
        }
      }
      
      // Fallback vers ordinal pour quantitative si pas d'interpolateur
      scale = d3.scaleOrdinal().domain(domain).range(finalColors);
      this.logger.debug(`Ordinal scale created (${label}) as fallback for quantitative`);
    } else {
      // Pour ordinal (défaut)
      scale = d3.scaleOrdinal().domain(domain).range(finalColors);
      this.logger.debug(`Ordinal scale created (${label})`);
    }

    return scale;
  }

  /**
   * Obtient la méthode D3 appropriée selon le type d'échelle
   * @param {string} type - Type d'échelle ('ordinal', 'quantitative', 'sequential')
   * @returns {function} Constructeur d'échelle D3
   */
  getD3Method(type) {
    switch (type) {
      case 'quantitative':
      case 'sequential':
        return d3.scaleSequential;
      case 'ordinal':
      default:
        return d3.scaleOrdinal;
    }
  }

  /**
   * Obtient une palette de couleurs simple par nom
   * @param {string} name - Nom du schéma (ex: "Blues", "Blues[5]", "Category10")
   * @param {number} size - Taille souhaitée de la palette
   * @param {string} scaleType - Type d'échelle ('ordinal' ou 'quantitative')
   * @returns {Array} Palette de couleurs
   */
  getColorPalette(name, size = 8, scaleType = 'ordinal') {
    const parsed = this.parseD3ColorScheme(name, scaleType);
    
    if (parsed?.type === "interpolate") {
      return d3.quantize(parsed.value, size);
    } else if (parsed?.type === "scheme") {
      const scheme = parsed.value;
      if (Array.isArray(scheme)) {
        return scheme.slice(0, size);
      }
    }
    
    // Fallback intelligent basé sur le type et la taille
    const smartFallback = this.getBestFallback(scaleType, size);
    if (typeof smartFallback === 'function') {
      try {
        return d3.quantize(smartFallback, size);
      } catch (error) {
        {
          const warningMessage = `Error with interpolator in getColorPalette: ${error.message}. Using Category10.`;
          const warningKey = warningMessage;
          if (!this.warningCache.has(warningKey)) {
            this.logger.warn(warningMessage);
            this.warningCache.add(warningKey);
          }
        }
        return d3.schemeCategory10.slice(0, Math.min(size, 10));
      }
    } else if (Array.isArray(smartFallback)) {
      return smartFallback.slice(0, size);
    }
    
    // Dernier recours
    try {
      return d3.quantize(d3.interpolateViridis, size);
    } catch (error) {
      {
        const warningMessage = `Error with Viridis interpolator: ${error.message}. Using Category10.`;
        const warningKey = warningMessage;
        if (!this.warningCache.has(warningKey)) {
          this.logger.warn(warningMessage);
          this.warningCache.add(warningKey);
        }
      }
      return d3.schemeCategory10.slice(0, Math.min(size, 10));
    }
  }

  /**
   * Trouve tous les indices d'une valeur dans un array
   * @param {Array} array - Array à chercher
   * @param {*} value - Valeur à trouver
   * @returns {Array} Indices trouvés
   */
  getAllIndexes(array, value) {
    const indexes = [];
    let i = -1;
    while ((i = array.indexOf(value, i + 1)) !== -1) {
      indexes.push(i);
    }
    return indexes;
  }

  /**
   * Vide le cache des échelles et des warnings
   */
  clearCache() {
    this.scaleCache.clear();
    this.warningCache.clear();
    this.logger.debug('Cache cleared');
  }
}

// Fonction utilitaire pour parser les schémas D3 (compatible avec le code existant)
export function parseD3ColorScheme(schemeName, scaleType = 'ordinal') {
  const calculator = new ColorScaleCalculator();
  return calculator.parseD3ColorScheme(schemeName, scaleType);
}

// Fonction utilitaire pour créer une échelle de couleurs
// Retourne directement la fonction d'échelle D3 (ex: d3.scaleOrdinal().domain(...).range(...))
export function createColorScale({ domain, range, scaleType = 'ordinal', fallbackInterpolator = null, label = "Color" }) {
  const calculator = new ColorScaleCalculator();
  return calculator.createColorScale({ domain, range, scaleType, fallbackInterpolator, label });
}
