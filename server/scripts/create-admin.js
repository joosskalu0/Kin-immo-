/**
 * Script CLI sécurisé pour créer ou mettre à jour un administrateur Kinimmo
 * Usage :
 *   node scripts/create-admin.js monemail@domaine.cd MonMotDePasseSecret123! "Nom Administrateur"
 */

const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const crypto = require('crypto');

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] ? args[0].trim().toLowerCase() : null;
  const password = args[1] ? args[1].trim() : null;
  const name = args[2] ? args[2].trim() : 'Administrateur Principal Kinimmo';

  if (!email || !password) {
    console.error('❌ Paramètres manquants !');
    console.log('\nUsage :');
    console.log('  node scripts/create-admin.js <email> <mot_de_passe> "<nom_complet>"\n');
    console.log('Exemple :');
    console.log('  node scripts/create-admin.js direction@votredomaine.cd SuperPassKinshasa2026! "Direction Générale Kinimmo"\n');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Le mot de passe doit contenir au moins 8 caractères pour des raisons de sécurité.');
    process.exit(1);
  }

  try {
    console.log(`🔒 Hachage sécurisé du mot de passe avec bcrypt (10 rounds)...`);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Vérifier si l'utilisateur existe déjà
    const [existing] = await pool.query('SELECT id, email, role FROM users WHERE email = ?', [email]);

    if (existing && existing.length > 0) {
      console.log(`⚠️ Un compte existe déjà avec l'adresse e-mail "${email}". Mise à jour des privilèges et du mot de passe...`);
      await pool.query(
        `UPDATE users 
         SET name = ?, password_hash = ?, role = 'admin', is_verified = 1, kinshasa_badge_verified = 1, updated_at = NOW() 
         WHERE email = ?`,
        [name, passwordHash, email]
      );
      console.log(`✅ Compte administrateur "${email}" mis à jour avec succès !`);
    } else {
      const id = 'usr_' + crypto.randomUUID();
      console.log(`✨ Création du compte administrateur "${email}" dans la table users...`);
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, is_verified, kinshasa_badge_verified, plan_id, subscription_status)
         VALUES (?, ?, ?, ?, 'admin', 1, 1, 'enterprise', 'Active')`,
        [id, name, email, passwordHash]
      );
      console.log(`✅ Administrateur créé avec succès avec l'ID : ${id}`);
    }

    console.log('\n======================================================');
    console.log('🎉 COMPTE ADMINISTRATEUR OPÉRATIONNEL');
    console.log(`📧 Email : ${email}`);
    console.log(`🛡️ Rôle  : admin (Privilèges complets)`);
    console.log(`🔗 Accès : Connectez-vous sur https://votredomaine.com/admin`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'administrateur :', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createAdmin();
