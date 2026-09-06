# Guide Complet de Déploiement Hostinger (Espaces Séparés & Zéro Démo)

Ce guide détaille pas à pas comment déployer **Kinimmo** sur votre hébergement **Hostinger** avec une architecture séparée, sécurisée, et **sans aucune donnée ni compte de démo**.

---

## 🏗️ 1. Architecture Séparée (Zero-Leak)

Pour une sécurité maximale :
1. **Frontend (Interface Utilisateur & Admin)** :
   - Situé dans le dossier `public_html/` de votre hébergement web.
   - Entièrement statique et ultra-rapide (React 19 + Tailwind CSS).
   - **Aucun identifiant MySQL**, mot de passe ou clé secrète n'est présent dans le code envoyé au navigateur.
2. **Backend (API REST Node.js & Authentification)** :
   - Situé dans un dossier séparé (ex: `api_kinimmo/` ou sous-domaine `api.votredomaine.com`).
   - Tourne avec Node.js (via le gestionnaire Node.js de Hostinger ou VPS).
   - Seul ce serveur a accès au fichier `server/.env` contenant les identifiants MySQL.
3. **Base de Données MySQL** :
   - Hébergée sur votre serveur Hostinger MySQL.
   - Accessible uniquement depuis `localhost` par votre backend Node.js.

---

## 🗄️ 2. Étape 1 : Créer la Base de Données MySQL sur Hostinger

1. Connectez-vous à votre panneau de contrôle **Hostinger (hPanel)**.
2. Allez dans **Bases de données** > **Gestion des bases de données MySQL**.
3. Remplissez le formulaire de création :
   - **Nom de la base de données** : ex. `kinimmo_prod` (Hostinger préfixera automatiquement, ex: `u123456789_kinimmo_prod`).
   - **Nom d'utilisateur MySQL** : ex. `admin_kinimmo` (ex: `u123456789_admin_kinimmo`).
   - **Mot de passe** : Générez un mot de passe fort (ex: 20 caractères avec majuscules, minuscules, chiffres et symboles).
4. Cliquez sur **Créer**.
5. Notez ces 4 informations précieusement :
   - **Hôte** : `localhost`
   - **Nom de la base** : `u123456789_kinimmo_prod`
   - **Utilisateur** : `u123456789_admin_kinimmo`
   - **Mot de passe** : votre mot de passe

---

## 📥 3. Étape 2 : Importer la Structure MySQL (Sans Démo)

1. Dans la liste de vos bases de données sur Hostinger, cliquez sur **Entrer dans phpMyAdmin**.
2. Cliquez sur votre base de données dans la colonne de gauche.
3. Cliquez sur l'onglet **Importer** en haut.
4. Cliquez sur **Choisir un fichier** et sélectionnez `server/schema.sql`.
5. Cliquez sur **Exécuter** en bas de page.
   - Les tables (`users`, `properties`, `agents`, `agencies`, `invoices`, `pricing_plans`, etc.) sont créées.
   - **Important** : Aucune donnée de démonstration ni compte administrateur par défaut n'est injecté.

---

## ⚙️ 4. Étape 3 : Configurer et Lancer le Backend Node.js

### Option A : Via le Gestionnaire Node.js de Hostinger (Hébergement Cloud / Pro)
1. Dans hPanel, allez dans **Avancé** > **Node.js**.
2. Cliquez sur **Créer une application**.
3. Définissez :
   - **Version de Node.js** : 20.x ou 22.x
   - **Dossier de l'application** : `api_kinimmo` (ou le dossier où vous téléversez le contenu du dossier `server/`).
   - **Fichier de démarrage (Startup File)** : `server.js`
4. Téléversez les fichiers du dossier `server/` dans ce répertoire.
5. Créez un fichier `.env` dans ce répertoire avec vos accès réels :
```env
PORT=5000
NODE_ENV=production

# Base de données MySQL Hostinger
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_admin_kinimmo
DB_PASSWORD=VotreMotDePasseTresSecurise123!
DB_NAME=u123456789_kinimmo_prod

# Clé de chiffrement JWT (très importante)
JWT_SECRET=chaine_secrete_aleatoire_tres_longue_987654321_kinshasa_prod
JWT_EXPIRES_IN=15d

# Domaine de votre site web (sans slash final)
FRONTEND_URL=https://votredomaine.com
```

### Option B : Sur VPS Hostinger (Ubuntu / Debian)
Si vous avez un VPS Hostinger :
```bash
cd /var/www/kinimmo-backend
npm install --production
# Créer le fichier .env
nano .env
# Démarrer avec PM2
pm2 start server.js --name "kinimmo-api"
pm2 save
pm2 startup
```

---

## 👤 5. Étape 4 : Créer Votre Propre Administrateur Réel

Pour garantir qu'aucun mot de passe par défaut ne soit utilisé :

Ouvrez le terminal SSH Hostinger (ou le terminal web hPanel) dans le dossier de votre backend et lancez :
```bash
node scripts/create-admin.js votre_email@domaine.cd VotreMotDePasseSecret123! "Votre Nom Complet"
```

Exemple :
```bash
node scripts/create-admin.js direction@kinimmo.cd KinshasaCapitale2026! "Direction Générale Kinimmo"
```

Le script :
- Hache votre mot de passe avec `bcrypt` (10 rounds).
- Crée l'administrateur dans votre table MySQL `users` avec le rôle `admin` et tous les badges vérifiés.
- Affiche la confirmation d'accès.

---

## 🚀 6. Étape 5 : Compiler et Déployer le Frontend

1. Sur votre machine locale, compilez l'application web :
```bash
npm run build
```
2. La compilation génère le dossier `dist/`.
3. Le dossier `dist/` contient :
   - `index.html`
   - `.htaccess` (automatiquement copié pour la gestion des URL et la sécurité)
   - Les dossiers d'assets JavaScript et CSS minifiés.
4. Ouvrez le **Gestionnaire de fichiers** Hostinger (ou utilisez FileZilla FTP).
5. Allez dans le dossier `public_html/` de votre domaine.
6. Supprimez le fichier `default.php` de bienvenue Hostinger s'il est présent.
7. Téléversez **tout le contenu** du dossier `dist/` directement dans `public_html/`.

---

## 🔒 7. Étape 6 : Activer le Certificat SSL HTTPS

1. Dans Hostinger hPanel, allez dans **Sécurité** > **SSL**.
2. Activez le certificat **Let's Encrypt Gratuit** pour votre nom de domaine.
3. Activez l'option **Forcer HTTPS**.

---

## ✅ 8. Vérification et Accès

1. Accédez à votre site public : `https://votredomaine.com`
2. Accédez à votre panneau d'administration : `https://votredomaine.com/admin`
3. Saisissez votre adresse email et votre mot de passe secret configurés à l'Étape 4.
4. Le tableau de bord affiche le badge vert **MySQL Connecté** et vos vraies données en temps réel !
