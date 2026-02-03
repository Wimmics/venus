/**
 * Utilitaire pour récupérer des données SPARQL avec gestion automatique CORS/proxy
 * Réutilisable dans plusieurs composants
 */
export class SparqlDataFetcher {
  constructor() {
    this.currentEndpoint = null;
    this.currentProxyUrl = null;
    
    // Logging configuration - set to false to show only warnings and errors
    this.enableDebugLogs = false;
  }

  /**
   * Centralized logging methods for consistent output
   */
  _logDebug(message, ...args) {
    if (this.enableDebugLogs) {
      console.log(`%c[SparqlDataFetcher] ${message}`, 'color:rgb(172, 175, 76)', ...args);
    }
  }

  _logInfo(message, ...args) {
    if (this.enableDebugLogs) {
      console.info(`%c[SparqlDataFetcher] ${message}`, 'color: #2196F3', ...args);
    }
  }

  _logWarn(message, ...args) {
    console.warn(`%c[SparqlDataFetcher] WARNING: ${message}`, 'color: #FF9800; font-weight: bold', ...args);
  }

  _logError(message, ...args) {
    console.error(`%c[SparqlDataFetcher] ERROR: ${message}`, 'color: #F44336; font-weight: bold', ...args);
  }

  /**
   * Affiche une erreur personnalisée
   */
  showCustomProxyError() {
    this._logError('CORS problem detected or proxy not functional.');
    this._logError('════════════════════════════════════════════════════════════════════════════');
    this._logError('To resolve this issue, you need to configure a local proxy server.');
    this._logError('COMPLETE DOCUMENTATION:');
    this._logError('   → https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md');
    this._logError('');
    this._logError('QUICK SUMMARY:');
    this._logError('   1. Create file server/proxy.js (code in documentation)');
    this._logError('   2. Install: npm install express node-fetch@2 cors');
    this._logError('   3. Launch: node server/proxy.js');
    this._logError('   4. Refresh this page');
    this._logError('════════════════════════════════════════════════════════════════════════════');
  }

  /**
   * Détecter si l'erreur est due à CORS
   */
  isCorsError(error) {
    const corsIndicators = [
      'Failed to fetch',
      'NetworkError',
      'CORS',
      'Cross-Origin',
      'blocked by CORS policy',
      'Access-Control-Allow-Origin',
      'TypeError: Failed to fetch'
    ];
    
    return corsIndicators.some(indicator => 
      error.message.includes(indicator) || error.toString().includes(indicator)
    );
  }

  /**
   * Exécute une requête SPARQL avec hiérarchie : proxy en priorité si fourni, sinon endpoint direct puis proxy
   */
  async executeSparqlQueryWithFallback(endpoint, query, proxyUrl = null, onProxyError = null, onNotification = null) {
    this._logDebug('Starting SPARQL query execution');
    this._logDebug('Target endpoint:', endpoint);
    
    // NOUVELLE LOGIQUE : Si proxy fourni, l'utiliser en priorité
    const proxyIsProvided = proxyUrl && proxyUrl.trim() !== '';
    if (proxyIsProvided) {
      this._logDebug('Proxy provided, using as priority');
      try {
        this._logDebug(`Priority attempt: Configured proxy via ${proxyUrl}`);
        
        const params = new URLSearchParams({ endpoint: endpoint, query: query });
        const fullProxyUrl = `${proxyUrl}?${params.toString()}`;

        const response = await fetch(fullProxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/sparql-results+json, application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Proxy error (${response.status}): ${errorData}`);
        }
        const result = await response.json();
        this._logDebug('Success with priority proxy');
        return result;
      } catch (proxyError) {
        this._logError('Failed with priority proxy:', proxyError.message);
        
        const isProxyConnectionError = proxyError.message.includes('Failed to fetch') || 
                                      proxyError.message.includes('Connection refused') ||
                                      proxyError.message.includes('Network Error');
        
        if (isProxyConnectionError) {
          this.showCustomProxyError();
          if (onProxyError) onProxyError();
          if (onNotification) onNotification(`The proxy configured on ${proxyUrl} seems not to be working. Check that the proxy is started and accessible.`, 'error');
        } else {
          if (onNotification) onNotification(`Remote SPARQL endpoint error via proxy. Check the endpoint URL or try a simpler query.`, 'error');
          this._logError('Remote SPARQL endpoint returned an error via proxy:', proxyError.message);
        }
        
        throw new Error(`Configured proxy at ${proxyUrl} failed in priority. Details: ${proxyError.message}`);
      }
    }
    
    // LOGIQUE EXISTANTE : Endpoint direct puis proxy en fallback
    // 1 : Endpoint direct
    try {
      this._logDebug('Attempt 1: Direct endpoint');
      return await this.executeSparqlQuery(endpoint, query);
    } catch (directError) {
      this._logWarn('Failed with direct endpoint:', directError.message);
      
      // Vérification de si c'est bien une erreur CORS
      if (this.isCorsError(directError)) {
        this._logDebug('CORS error detected - Attempting with local proxy...');

        // Vérifier si une URL de proxy est bien fournie
        if (!proxyUrl) {
          this._logError('No proxy URL provided to bypass CORS');
          this.showCustomProxyError();
          if (onProxyError) onProxyError();
          if (onNotification) onNotification('CORS error detected but no proxy URL configured. Please configure a SPARQL proxy.', 'error');
          throw new Error('CORS error - Missing proxy URL');
        }

        // 2 : Proxy configuré par l'utilisateur
        try {
          this._logDebug(`Attempt 2: Configured proxy via ${proxyUrl}`);
          
          const params = new URLSearchParams({ endpoint: endpoint, query: query });
          const fullProxyUrl = `${proxyUrl}?${params.toString()}`;

          const response = await fetch(fullProxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/sparql-results+json, application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Proxy error (${response.status}): ${errorData}`);
          }
          const result = await response.json();
          this._logDebug('Success with configured proxy');
          return result;
        } catch (proxyError) {
          this._logError('Failed with configured proxy:', proxyError.message);
          
          const isProxyConnectionError = proxyError.message.includes('Failed to fetch') || 
                                        proxyError.message.includes('Connection refused') ||
                                        proxyError.message.includes('Network Error');
          
          if (isProxyConnectionError) {
            this.showCustomProxyError();
            if (onProxyError) onProxyError();
            if (onNotification) onNotification(`The proxy configured on ${proxyUrl} seems not to be working. Check that the proxy is started and accessible.`, 'error');
          } else {
            if (onNotification) onNotification(`Remote SPARQL endpoint error. Check the endpoint URL or try a simpler query.`, 'error');
            this._logError('Remote SPARQL endpoint returned an error:', proxyError.message);
          }
          
          throw new Error(`Configured proxy at ${proxyUrl} failed after CORS error. Details: ${proxyError.message}`);
        }
      } else {
        this._logError('Non-CORS error with direct endpoint:', directError);
        throw directError;
      }
    }
  }

  /**
   * Exécute une requête SPARQL directe
   */
  async executeSparqlQuery(endpoint, query) {
    const params = new URLSearchParams();
    params.append('query', query.trim());
    params.append('format', 'json');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json'
      },
      body: params
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Récupère les données avec hiérarchie : JSON direct > endpoint > proxy
   * MÉTHODE INTERNE : Utilisée par les composants pour récupérer les données brutes SPARQL
   */
  async fetchSparqlData(endpoint, query, jsonData = null, proxyUrl = null, onProxyError = null, onNotification = null) {
    try {
      // 1: Données JSON fournies directement
      if (jsonData) {
        this._logDebug('Using directly provided JSON data');
        
        return {
          status: 'success',
          method: 'direct-json',
          message: `Data loaded from JSON`,
          data: jsonData,
          rawData: jsonData
        };
      }
      
      // 2 et 3: Endpoint puis proxy
      this._logDebug('Fetching data from endpoint...');
      this.currentEndpoint = endpoint;
      this.currentProxyUrl = proxyUrl;
      
      const rawData = await this.executeSparqlQueryWithFallback(endpoint, query, proxyUrl, onProxyError, onNotification);
      
      return {
        status: 'success',
        method: 'endpoint-or-proxy',
        message: `Data loaded from endpoint`,
        data: rawData,
        rawData: rawData
      };
    } catch (error) {
      this._logError('Error while loading data:', error.message);
      return {
        status: 'error',
        message: `Error: ${error.message}`,
        data: null,
        rawData: null
      };
    }
  }
} 