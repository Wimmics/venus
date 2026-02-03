/**
 * Proxy SPARQL pour résoudre les problèmes CORS
 * Ce fichier doit être configuré selon votre environnement
 */

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PROXY_PORT || 3001; // Le port sur lequel le proxy écoutera

app.use(cors()); // Permettre les requêtes Cross-Origin
app.use(express.json()); // Pour parser le corps des requêtes JSON (si on passe endpoint/query dans le body)

// Un endpoint de statut simple pour vérifier si le proxy est en cours d'exécution
app.get('/proxy-status', (req, res) => {
  res.status(200).json({ status: 'Proxy is running' });
});

async function executeQuery(endpoint, sparqlQuery, method = 'POST', res) {
  console.log(`[Proxy] Tentative ${method} vers: ${endpoint}`);
  try {
    const headers = {
      'Accept': 'application/sparql-results+json, application/json',
      'User-Agent': 'vis-graph-Proxy/1.0'
    };
    let body;
    let targetUrl = endpoint;

    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams();
      params.append('query', sparqlQuery);
      body = params;
    } else {
      targetUrl = `${endpoint}?query=${encodeURIComponent(sparqlQuery)}`;
    }

    const response = await fetch(targetUrl, {
      method: method,
      headers: headers,
      body: method === 'POST' ? body : undefined,
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Erreur de l'endpoint (${method} ${response.status}): ${errorText}`);
      throw new Error(`Endpoint error (${method} ${response.status}): ${response.statusText}. Body: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[Proxy] Succès ${method} pour ${endpoint}`);
    res.json(data);
    return true;

  } catch (error) {
    console.error(`[Proxy] Échec de la requête ${method} vers ${endpoint}:`, error.message);
    throw error;
  }
}

// Route principale - essaie POST puis GET si ça échoue
app.all('/sparql-proxy', async (req, res) => {
  const { endpoint, query: sparqlQuery } = { ...req.query, ...req.body };

  if (!endpoint || !sparqlQuery) {
    return res.status(400).json({
      error: 'Les paramètres "endpoint" et "query" sont requis.',
    });
  }

  console.log(`[Proxy] Reçu pour proxy: Endpoint=${endpoint}`);

  try {
    console.log('[Proxy] Tentative avec POST...');
    await executeQuery(endpoint, sparqlQuery, 'POST', res);
  } catch (postError) {
    console.warn('[Proxy] Échec POST, tentative avec GET...');
    try {
      await executeQuery(endpoint, sparqlQuery, 'GET', res);
    } catch (getError) {
      console.error(`[Proxy] Échec final pour ${endpoint}. POST error: ${postError.message}, GET error: ${getError.message}`);
      res.status(500).json({
        error: 'Proxy failed for both POST and GET requests.',
        postError: postError.message,
        getError: getError.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Serveur proxy SPARQL démarré sur http://localhost:${PORT}`);
  console.log(`Utilisez http://localhost:${PORT}/sparql-proxy en fournissant 'endpoint' et 'query' comme paramètres.`);
  console.log(`Exemple: http://localhost:${PORT}/sparql-proxy?endpoint=YOUR_SPARQL_ENDPOINT&query=YOUR_SPARQL_QUERY`);
});

// Éviter que le proxy crashe silencieusement
process.on('uncaughtException', (error) => {
  console.error('[Proxy] Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Proxy] Unhandled Rejection at:', promise, 'reason:', reason);
}); 