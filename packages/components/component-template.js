/**
 * Classe de base pour tous les composants de visualisation
 */
export class BaseVisualization extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.data = null;
    this.width = 800;
    this.height = 500;
    this.margin = { top: 40, right: 40, bottom: 60, left: 60 };
  }

  /**
   * Liste des attributs à observer
   */
  static get observedAttributes() {
    return ['width', 'height', 'sparql-results'];
  }

  /**
   * Gestion des changements d'attributs
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'width':
        this.width = parseInt(newValue) || 800;
        this.render();
        break;
      case 'height':
        this.height = parseInt(newValue) || 500;
        this.render();
        break;
      case 'sparql-results':
        try {
          this.data = JSON.parse(newValue);
          this.processData();
          this.render();
        } catch (e) {
          console.error('Format de résultats SPARQL invalide:', e);
          this.renderError('Format de données invalide');
        }
        break;
    }
  }

  /**
   * Initialisation quand le composant est ajouté au DOM
   */
  connectedCallback() {
    this.render();
  }

  /**
   * Définit les résultats SPARQL via JavaScript
   * @param {Object} resultsJson - Résultats SPARQL au format JSON
   */
  setSparqlResults(resultsJson) {
    this.data = resultsJson;
    this.processData();
    this.render();
  }

  /**
   * Définit la requête SPARQL et l'exécute
   * @param {string} query - Requête SPARQL
   * @param {string} endpoint - URL de l'endpoint SPARQL
   */
  setQuery(query, endpoint) {
    if (!query || !endpoint) {
      console.error('La requête ou l\'endpoint SPARQL est manquant');
      return;
    }

    // Afficher un indicateur de chargement
    this.renderLoading();

    // Exécuter la requête SPARQL
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/json'
      },
      body: query
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      this.data = data;
      this.processData();
      this.render();
    })
    .catch(error => {
      console.error('Erreur lors de l\'exécution de la requête SPARQL:', error);
      this.renderError(error.message);
    });
  }

  /**
   * Traite les données SPARQL pour les préparer à la visualisation
   * Cette méthode doit être surchargée par les classes dérivées
   */
  processData() {
    // À implémenter dans les classes dérivées
    if (!this.data) return;
    
    console.log('Données SPARQL reçues:', this.data);
    // Implémentation par défaut: extraire les variables
    if (this.data.head && this.data.head.vars) {
      this.variables = this.data.head.vars;
    }
  }

  /**
   * Rend la visualisation
   * Cette méthode doit être surchargée par les classes dérivées
   */
  render() {
    // Implémentation par défaut
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .container {
          width: ${this.width}px;
          height: ${this.height}px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .error {
          color: red;
          padding: 20px;
          text-align: center;
        }
        .loading {
          color: #666;
          text-align: center;
        }
      </style>
      <div class="container">
        <p>Cette visualisation doit être implémentée dans une classe dérivée.</p>
      </div>
    `;
  }

  /**
   * Affiche un message d'erreur
   */
  renderError(message) {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .error {
          color: red;
          padding: 20px;
          border: 1px solid red;
          border-radius: 4px;
          background-color: #ffeeee;
          width: ${this.width}px;
          height: auto;
          min-height: 100px;
        }
      </style>
      <div class="error">
        <h3>Erreur</h3>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Affiche un indicateur de chargement
   */
  renderLoading() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .loading {
          color: #666;
          padding: 20px;
          text-align: center;
          width: ${this.width}px;
          height: ${this.height}px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 4px solid #3498db;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin-right: 10px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <div class="loading">
        <div class="spinner"></div>
        <p>Chargement des données...</p>
      </div>
    `;
  }

  /**
   * Extrait le nom de l'URI pour un affichage plus propre
   */
  extractNameFromURI(uri) {
    if (!uri) return '';
    
    // Essayer d'extraire le dernier segment après / ou #
    const match = uri.match(/[/#]([^/#]+)$/);
    if (match && match[1]) {
      return match[1];
    }
    
    return uri;
  }
} 