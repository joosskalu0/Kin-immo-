/**
 * Script d'initialisation et de migration de la base de données MySQL Kinimmo
 * Exécute l'intégralité du fichier schema.sql dans la base de données configurée.
 * 
 * Usage :
 *   npm run init-db
 *   ou: node scripts/init-db.js
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function initDatabase() {
  console.log('====================================================');
  console.log('🛠️ INITIALISATION DE LA BASE DE DONNÉES MYSQL KINIMMO');
  console.log('====================================================');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  const dbName = process.env.DB_NAME || 'kinimmo_db';

  console.log(`🔌 Connexion au serveur MySQL sur ${config.host}:${config.port} avec l'utilisateur "${config.user}"...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connecté au serveur MySQL !');

    // 1. Créer la base de données si elle n'existe pas
    console.log(`📦 Vérification / Création de la base de données "${dbName}"...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);
    console.log(`✅ Base de données "${dbName}" prête.`);

    // 2. Lire le fichier schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Le fichier schema.sql est introuvable à l'emplacement : ${schemaPath}`);
    }

    console.log(`📄 Lecture du schéma SQL complet (${schemaPath})...`);
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');

    // 3. Exécuter le script SQL
    console.log('⚡ Déploiement des 21 tables et relations avec clés étrangères...');
    await connection.query(sqlContent);

    // 4. Compter les tables créées
    const [tables] = await connection.query('SHOW TABLES;');
    console.log(`\n🎉 SUCCÈS ! ${tables.length} tables MySQL sont actives :`);
    tables.forEach((t) => {
      const tableName = Object.values(t)[0];
      console.log(`   - 📁 ${tableName}`);
    });

    console.log('\n====================================================');
    console.log('🚀 Base de données MySQL Kinimmo prête pour la production !');
    console.log('Pour lancer l\'API : npm run start');
    console.log('====================================================\n');

  } catch (error) {
    console.error('\n❌ ERREUR lors de l\'initialisation MySQL :');
    console.error(error.message);
    console.log('\n💡 Conseil :');
    console.log('1. Vérifiez que MySQL est démarré sur votre machine ou hébergeur.');
    console.log('2. Remplissez correctement vos identifiants dans server/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
