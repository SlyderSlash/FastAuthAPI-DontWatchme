const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('dbAPIKey.sqlite');

const apikeyMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  // Vérifie si la clé API existe dans la base de données
  const sql = 'SELECT * FROM api_keys WHERE api_key = ?';
  db.get(sql, [apiKey], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Vérifie si le nombre d'appels maximum n'a pas été atteint
    if (row.calls >= row.limit) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Incrémente le compteur d'appels et met à jour la base de données
    const sqlUpdate = 'UPDATE api_keys SET calls = calls + 1 WHERE api_key = ?';
    db.run(sqlUpdate, [apiKey], (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    // Ajoute une entrée dans le journal d'appels
    const timestamp = Date.now();
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const sqlInsert = 'INSERT INTO api_logs (api_key, ip_address, timestamp) VALUES (?, ?, ?)';
    db.run(sqlInsert, [apiKey, ip, timestamp], (err) => {
      if (err) {
        console.error(err.message);
      }
    });

    // Ajoute la clé API à la demande pour être utilisée par les routes suivantes
    req.apiKey = apiKey;

    // Continue la chaîne de middleware
    next();
  });
};






module.exports = apikeyMiddleware