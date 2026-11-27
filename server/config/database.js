const mysql = require('mysql2/promise');
require('dotenv').config();

// Déterminer l'hôte : forcer IPv4 '127.0.0.1' si 'localhost' pour éviter le rejet IPv6 '::1' sur Hostinger MySQL
const dbHost = (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') 
  ? process.env.DB_HOST 
  : '127.0.0.1';

// Configuration du pool de connexions MySQL
const pool = mysql.createPool({
  host: dbHost,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kinimmo_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '+00:00'
});

const WRAPPED_SQL_CONN = Symbol('kinimmoWrappedSqlConn');

/**
 * mysql2/promise rejette explicitement `undefined` dans les paramètres liés :
 * convertir systématiquement `undefined` en `null` (SQL NULL) pour éviter tout crash.
 */
function sanitizeBindParams(params) {
  if (!Array.isArray(params)) return params;
  return params.map((value) => (value === undefined ? null : value));
}

function wrapSqlMethod(target, methodName) {
  if (!target || typeof target[methodName] !== 'function') return;
  const original = target[methodName].bind(target);
  target[methodName] = (sqlOrOptions, params, ...rest) => {
    const normalizedSql =
      sqlOrOptions && typeof sqlOrOptions === 'object' && Array.isArray(sqlOrOptions.values)
        ? { ...sqlOrOptions, values: sanitizeBindParams(sqlOrOptions.values) }
        : sqlOrOptions;
    if (params === undefined && rest.length === 0) {
      return original(normalizedSql);
    }
    return original(normalizedSql, sanitizeBindParams(params), ...rest);
  };
}

wrapSqlMethod(pool, 'execute');
wrapSqlMethod(pool, 'query');

const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async (...args) => {
  const connection = await originalGetConnection(...args);
  if (connection && !connection[WRAPPED_SQL_CONN]) {
    connection[WRAPPED_SQL_CONN] = true;
    wrapSqlMethod(connection, 'execute');
    wrapSqlMethod(connection, 'query');
  }
  return connection;
};

// Test initial de la connexion à la base de données
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[MySQL] Connecté avec succès à la base "${process.env.DB_NAME || 'kinimmo_db'}" sur ${process.env.DB_HOST || 'localhost'}`);
    connection.release();
  } catch (error) {
    console.error('[MySQL Erreur de Connexion]', error.message);
    console.warn('[MySQL Conseil] Vérifiez vos identifiants dans le fichier .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)');
  }
}

if (process.env.NODE_ENV !== 'test') {
  testConnection();
}

pool.sanitizeBindParams = sanitizeBindParams;

module.exports = pool;
