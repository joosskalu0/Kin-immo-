# Plan d'Implémentation : Finalisation Intégrale du Module VITRINE & Mises en Avant (Kinimmo)

Ce plan formalise l'audit, la correction et la finalisation complète du module **VITRINE** de Kinimmo, conformément aux règles d'architecture (Node.js + MySQL hébergé sur Hostinger, aucune utilisation de Firebase/Firestore ou Cloud Run, préservation stricte des tables et relations existantes, aucune donnée factice).

---

## 1. Architecture des Données & Logique Métier (MySQL & Backend Node.js)

### Tables Impliquées
* `listing_boosts` :
  - Colonnes existantes / auditées : `id`, `user_id`, `property_id`, `pack_id`, `status` (`pending`, `active`, `rejected`, `expired`, `suspended`), `starts_at`, `expires_at`, `remaining_seconds_frozen` (ou calcul des jours gelés lors de suspension), `created_at`, `admin_id`, `reviewed_at`, `rejection_reason`.
* `properties` :
  - `featured` (BOOLEAN), `boost_expires_at` (DATETIME), `published` (BOOLEAN), `status` (`available`, `rented`, `sold`, `archived`, `suspended`, etc.), `agent_id` / `user_id`.
* `hero_showcase_slides` :
  - Synchronisé avec les propriétés dont le boost est actif et approuvé.

### Nouvelles Opérations API Administrateur (`server/controllers/billingController.js`, `server/routes/billing.js`, `server.ts`)
1. **`GET /api/billing/admin/boost-requests`** :
   - Récupère toutes les demandes avec jointures : propriétaire/agent (`users.name`, `users.email`, `users.phone`), bien (`properties.title`, `properties.price`, `properties.images`, `properties.city`, `properties.commune`, `properties.published`), et administrateur ayant traité l'action (`admin_user.name`).
   - Support des filtres : `all`, `pending`, `active`, `rejected`, `expired`, `suspended`.
2. **`POST /api/billing/admin/boost-requests/:id/approve`** :
   - Transition vers `active`, calcule `starts_at = NOW()`, `expires_at = NOW() + INTERVAL duration DAY`.
   - Active `properties.featured = TRUE` et met à jour `boost_expires_at`.
   - Synchronise `hero_showcase_slides`.
3. **`POST /api/billing/admin/boost-requests/:id/reject`** :
   - Transition vers `rejected`, enregistre `rejection_reason`, `admin_id` et `reviewed_at`.
   - Désactive `properties.featured = FALSE`.
4. **`POST /api/billing/admin/boost-requests/:id/suspend`** :
   - **Règle de suspension retenue** : Geler le compteur de temps restant.
   - Calcule les secondes ou jours restants avant expiration (`expires_at - NOW()`).
   - Enregistre ce solde gelé, passe le statut à `suspended`, retire le bien de la vitrine (`properties.featured = FALSE`, `hero_showcase_slides.is_active = FALSE`).
5. **`POST /api/billing/admin/boost-requests/:id/resume`** :
   - Reprend le boost avec le solde gelé : `expires_at = NOW() + INTERVAL remaining_seconds SECOND`.
   - Passe le statut à `active`, réactive `properties.featured = TRUE` et `hero_showcase_slides.is_active = TRUE`.
6. **`POST /api/billing/admin/boost-requests/:id/duration`** :
   - Permet à l'administrateur d'ajuster ou prolonger manuellement la date de fin (`expires_at`).
7. **`DELETE /api/billing/admin/boost-requests/:id`** :
   - Supprime la demande et nettoie le statut de mise en avant du bien.
8. **`GET /api/billing/admin/vitrine-stats`** :
   - Statistiques complètes : Total demandes, En attente, Actives, Expirées, Suspendues, Revenus estimés ou réels.

---

## 2. Tableau de Bord Administrateur (Hub Vitrine & Boosts)

Amélioration du composant d'administration (`AdminHeroShowcaseManager.tsx` et intégration dans l'espace administration) :
* **Barre d'onglets et de filtres** :
  - *Toutes les demandes*
  - *En attente* (badges d'alerte visuels pour traitement rapide)
  - *Mises en avant actives* (compte à rebours dynamique des jours restants)
  - *Demandes refusées* (affichage du motif de refus et de l'admin responsable)
  - *Mises en avant expirées*
  - *Biens suspendus* (badge gelé avec solde de jours préservé)
* **Bloc Statistiques de la Vitrine** (KPIs synthétiques en tête de page).
* **Actions directes pour chaque demande** :
  - Modal ou champ pour **Refuser avec motif**.
  - Bouton **Approuver**.
  - Bouton **Suspendre (geler le temps restant)**.
  - Bouton **Réactiver (dégeler)**.
  - Bouton **Modifier la durée / prolonger**.
  - Bouton **Supprimer**.
  - Fiche détaillée de l'agent propriétaire (nom, email, téléphone, statut de son agence).
  - Traçabilité complète (nom de l'administrateur et date de l'action).

---

## 3. Espace Agent : Onglet Dédié "Mes Mises en Avant"

Intégration dans le tableau de bord Agent (`UserDashboard.tsx`) :
* **Nouvel onglet « Mes Mises en Avant »** à côté de « Mes Biens » et « Mes Factures » :
  - Liste exhaustive et sécurisée : l'agent ne voit **strictement que ses propres demandes** (filtrage par `user_id` côté backend et frontend).
  - Statut en temps réel de chaque demande :
    - `En attente de validation` (badge orange avec message explicatif).
    - `Active en Vitrine` (badge vert avec date de début, date de fin et jours restants).
    - `Refusée` (badge rouge avec **motif exact rédigé par l'administrateur**).
    - `Suspendue` (badge violet indiquant la mise en pause par l'administration).
    - `Expirée` (badge gris avec possibilité de renouveler la demande).
* **Bouton d'action « Demander une mise en avant »** :
  - Sélection parmi les biens publiés de l'agent non encore boostés.
  - Choix de la formule (ex: Mise en avant 7 jours, 14 jours, 30 jours).
  - Envoi sécurisé créant la demande en statut `pending` (interdiction stricte d'auto-validation par l'agent).

---

## 4. Affichage Public de la Vitrine (Page d'Accueil)

Création du composant dédié **`src/components/VitrineSection.tsx`** positionné **immédiatement sous la barre de recherche principale** :
* **Source exclusive de données** :
  - Appel API direct à `/api/showcase` ou `/api/properties?featured=true`.
  - Jointure stricte MySQL vérifiant que le bien existe, est publié, validé, actif, non vendu/loué, et que `boost_expires_at > NOW()`.
  - **Zéro donnée factice ou démonstration statique**. Si aucun bien n'est validé et actif, affichage d'un message élégant invitant les agents à booster leurs biens ou masquage gracieux sans casser la grille.
* **Format imposé de chaque carte de la Vitrine** :
  1. Photo principale haute définition avec ratio soigné.
  2. Titre du bien.
  3. Prix avec formatage monétaire (ex: `150 000 $` ou FC).
  4. Type de bien (Villa, Appartement, Terrain, etc.).
  5. Localisation : Commune et quartier (ex: *Gombe, Kinshasa*).
  6. Nombre de chambres (si applicable/disponible).
  7. Nom de l'agence ou de l'agent immobilier certifié.
  8. Badge officiel doré/ambré distinctif **« À LA UNE »**.
  9. Bouton interactif **« Voir le bien »** ouvrant la fiche détaillée du bien.

---

## 5. Gestion Automatique des Expirations

* La route backend filtre systématiquement avec la condition `boost_expires_at > NOW()` et `status = 'active'`.
* Dès qu'un boost dépasse sa date d'expiration :
  - Le bien est automatiquement exclu de la vitrine publique.
  - Le bien demeure parfaitement accessible dans le catalogue ordinaire s'il est publié et valide.
  - Un boost expiré ne peut en aucun cas être réactivé sans une nouvelle demande ou une action administrative explicite.

---

## 6. Étapes de Déploiement et Vérification

1. **Backend & Script SQL** :
   - Mise à jour de `server/quick_fix_missing_tables.sql` avec les champs de gel (`remaining_seconds_frozen`).
   - Implémentation des méthodes dans `server/controllers/billingController.js` et routes associées.
   - Implémentation miroir dans `server.ts` pour l'environnement de développement et de build.
2. **Couche API Client** :
   - Ajout des fonctions dans `src/services/mysqlApi.ts` (`adminSuspendBoost`, `adminResumeBoost`, `adminUpdateBoostDuration`, `adminDeleteBoost`, `getVitrineStats`, `getAgentBoostRequests`).
3. **Interface Utilisateur** :
   - Développement de `src/components/VitrineSection.tsx` et insertion dans `src/App.tsx` juste sous la recherche principale.
   - Refonte du gestionnaire administrateur dans `src/components/Admin/AdminHeroShowcaseManager.tsx`.
   - Ajout de l'onglet « Mes Mises en Avant » dans `src/components/UserDashboard.tsx`.
4. **Validation Technique** :
   - Exécution de `compile_applet` et `lint_applet` pour garantir zéro erreur TypeScript/ESLint.
   - Redémarrage du serveur et vérification visuelle des flux.
