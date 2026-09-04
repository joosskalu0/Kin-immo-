const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration du pool de connexions MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
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

testConnection();

module.exports = pool;
