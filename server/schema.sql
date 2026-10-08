-- ==========================================================
-- BASE DE DONNÉES KINIMMO - SCHÉMA COMPLET MYSQL (Hostinger)
-- ==========================================================

-- Désactivation temporaire des vérifications de clés étrangères pour éviter les erreurs d'ordre de création
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- 1. Table des Utilisateurs (users)
-- Rôles possibles : 'user', 'agent', 'agency', 'admin'
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `role` ENUM('user', 'agent', 'agency', 'admin') NOT NULL DEFAULT 'user',
  `agency_id` VARCHAR(64) DEFAULT NULL,
  `agency_name` VARCHAR(255) DEFAULT NULL,
  `avatar` TEXT DEFAULT NULL,
  `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `kinshasa_badge_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `rccm_or_nif` VARCHAR(100) DEFAULT NULL,
  `plan_id` VARCHAR(50) NOT NULL DEFAULT 'starter',
  `subscription_status` ENUM('Active', 'Expired') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. Table des Agences Immobilières (agencies)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agencies` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `logo` TEXT DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(100) NOT NULL DEFAULT 'Kinshasa',
  `commune` VARCHAR(100) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `manager_name` VARCHAR(255) DEFAULT NULL,
  `rccm` VARCHAR(100) DEFAULT NULL,
  `id_nat` VARCHAR(100) DEFAULT NULL,
  `nif` VARCHAR(100) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `subscription_status` ENUM('Active', 'Expired') NOT NULL DEFAULT 'Active',
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  `owner_user_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_agencies_commune` (`commune`),
  CONSTRAINT `fk_agencies_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. Table des Profils d'Agents Immobiliers (agents)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agents` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT 'Courtier Immobilier Kinshasa',
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `avatar` TEXT DEFAULT NULL,
  `agency_id` VARCHAR(64) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `rating` DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
  `review_count` INT NOT NULL DEFAULT 0,
  `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE,
  `specialties` JSON DEFAULT NULL,
  `languages` JSON DEFAULT NULL,
  `identity_doc_type` VARCHAR(100) DEFAULT NULL,
  `identity_doc_number` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_agents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_agents_agency` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. Table des Propriétés / Annonces (properties)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `properties` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` LONGTEXT NOT NULL,
  `price` DECIMAL(15, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `period` ENUM('month', 'year', 'total') NOT NULL DEFAULT 'total',
  `type` ENUM('apartment', 'house', 'villa', 'office', 'land', 'commercial', 'penthouse') NOT NULL DEFAULT 'apartment',
  `status` ENUM('for-sale', 'for-rent', 'pending', 'sold', 'open-house') NOT NULL DEFAULT 'for-sale',
  `category` VARCHAR(100) NOT NULL DEFAULT 'Résidentiel',
  `address` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL DEFAULT 'Kinshasa',
  `commune` VARCHAR(100) NOT NULL DEFAULT 'Gombe',
  `quartier` VARCHAR(100) DEFAULT NULL,
  `avenue` VARCHAR(255) DEFAULT NULL,
  `reference_point` VARCHAR(255) DEFAULT NULL,
  `zip_code` VARCHAR(50) DEFAULT 'KN-01',
  `country` VARCHAR(100) NOT NULL DEFAULT 'RDC',
  `lat` DECIMAL(10, 7) NOT NULL DEFAULT -4.322447,
  `lng` DECIMAL(10, 7) NOT NULL DEFAULT 15.307045,
  `bedrooms` INT NOT NULL DEFAULT 0,
  `bathrooms` INT NOT NULL DEFAULT 0,
  `area` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `year_built` INT DEFAULT NULL,
  `garages` INT NOT NULL DEFAULT 0,
  `amenities` JSON DEFAULT NULL,
  `custom_fields` JSON DEFAULT NULL,
  `video_url` VARCHAR(255) DEFAULT NULL,
  `virtual_tour_url` VARCHAR(255) DEFAULT NULL,
  `agent_id` VARCHAR(64) DEFAULT NULL,
  `agency_id` VARCHAR(64) DEFAULT NULL,
  `featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_premium` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_urgent` BOOLEAN NOT NULL DEFAULT FALSE,
  `listing_tier` ENUM('free', 'standard', 'premium', 'featured') NOT NULL DEFAULT 'free',
  `boost_expires_at` TIMESTAMP NULL DEFAULT NULL,
  `refresh_bump_at` TIMESTAMP NULL DEFAULT NULL,
  `published` BOOLEAN NOT NULL DEFAULT TRUE,
  `views_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_properties_status` (`status`),
  INDEX `idx_properties_type` (`type`),
  INDEX `idx_properties_commune` (`commune`),
  INDEX `idx_properties_price` (`price`),
  INDEX `idx_properties_featured` (`featured`),
  INDEX `idx_properties_tier` (`listing_tier`),
  CONSTRAINT `fk_properties_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_properties_agency` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. Table des Images de Propriétés (property_images)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `property_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `property_id` VARCHAR(64) NOT NULL,
  `image_url` TEXT NOT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_property_images_prop` (`property_id`),
  CONSTRAINT `fk_property_images_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. Table des Favoris (favorites)
-- Relie un utilisateur et une propriété
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `favorites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_property_favorite` (`user_id`, `property_id`),
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorites_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. Table des Messages et Demandes de Visite (messages / leads)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
  `id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) DEFAULT NULL,
  `sender_id` VARCHAR(64) DEFAULT NULL,
  `receiver_id` VARCHAR(64) NOT NULL,
  `sender_name` VARCHAR(255) NOT NULL,
  `sender_email` VARCHAR(255) NOT NULL,
  `sender_phone` VARCHAR(50) DEFAULT NULL,
  `message` TEXT NOT NULL,
  `request_type` ENUM('info', 'tour', 'offer') NOT NULL DEFAULT 'info',
  `tour_date` VARCHAR(50) DEFAULT NULL,
  `tour_time` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('new', 'contacted', 'viewing', 'closed') NOT NULL DEFAULT 'new',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_messages_receiver` (`receiver_id`),
  INDEX `idx_messages_sender` (`sender_id`),
  INDEX `idx_messages_status` (`status`),
  CONSTRAINT `fk_messages_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_messages_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. Table des Formules de Tarification (pricing_plans)
-- Gère les abonnements : particuliers, courtiers, agences, promoteurs immobiliers
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pricing_plans` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` ENUM('general', 'individual', 'agency', 'promoter') NOT NULL DEFAULT 'general',
  `badge` VARCHAR(50) DEFAULT NULL,
  `price_usd` DECIMAL(10, 2) NOT NULL,
  `price_cdf` DECIMAL(15, 2) NOT NULL,
  `billing_period` ENUM('monthly', 'quarterly', 'yearly') NOT NULL DEFAULT 'monthly',
  `max_listings` INT NOT NULL DEFAULT 5,
  `max_featured_listings` INT NOT NULL DEFAULT 0,
  `has_verified_badge` BOOLEAN NOT NULL DEFAULT FALSE,
  `has_crm_leads` BOOLEAN NOT NULL DEFAULT FALSE,
  `has_priority_support` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_plans_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8b. Table des Options de Visibilité à la carte (visibility_options)
-- Boosts : mise en avant, annonce premium, badge urgent, tête de liste
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `visibility_options` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT NOT NULL,
  `boost_type` ENUM('featured', 'premium', 'urgent', 'refresh', 'social_blast') NOT NULL DEFAULT 'featured',
  `duration_days` INT NOT NULL DEFAULT 7,
  `price_usd` DECIMAL(10, 2) NOT NULL,
  `price_cdf` DECIMAL(15, 2) NOT NULL,
  `badge_text` VARCHAR(50) DEFAULT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT 'Sparkles',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_visibility_active` (`is_active`),
  INDEX `idx_visibility_type` (`boost_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8c. Table des Boosts d'Annonces Actifs (listing_boosts)
-- Suivi de l'activation des options de visibilité pour chaque annonce
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `listing_boosts` (
  `id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `option_id` VARCHAR(50) NOT NULL,
  `invoice_id` VARCHAR(64) DEFAULT NULL,
  `status` ENUM('pending', 'active', 'expired', 'canceled') NOT NULL DEFAULT 'pending',
  `starts_at` TIMESTAMP NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_boost_property` (`property_id`),
  INDEX `idx_boost_user` (`user_id`),
  INDEX `idx_boost_status` (`status`),
  CONSTRAINT `fk_boost_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_boost_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_boost_option` FOREIGN KEY (`option_id`) REFERENCES `visibility_options` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8d. Table de la Régie Publicitaire & Bannières Sponsors (advertisements)
-- Promoteurs immobiliers, architectes, entreprises de construction, banques, assurances
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `advertisements` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `advertiser_name` VARCHAR(255) NOT NULL,
  `advertiser_contact` VARCHAR(100) DEFAULT NULL,
  `advertiser_email` VARCHAR(255) DEFAULT NULL,
  `category` ENUM('real_estate', 'construction', 'architecture', 'interior_design', 'banking', 'insurance', 'legal', 'general') NOT NULL DEFAULT 'general',
  `placement` ENUM('home_hero', 'search_top', 'sidebar', 'footer_banner', 'interstitial') NOT NULL DEFAULT 'home_hero',
  `image_url` TEXT NOT NULL,
  `target_url` TEXT NOT NULL,
  `alt_text` VARCHAR(255) DEFAULT NULL,
  `price_usd` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `impressions_count` INT NOT NULL DEFAULT 0,
  `clicks_count` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ads_placement` (`placement`),
  INDEX `idx_ads_category` (`category`),
  INDEX `idx_ads_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 9. Table des Coordonnées & Modes de Paiement (payment_methods)
-- M-Pesa, Airtel Money, Orange Money, Rawbank, EquityBCDC
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` VARCHAR(64) NOT NULL,
  `provider` ENUM('mpesa', 'airtel', 'orange', 'bank_transfer', 'card') NOT NULL,
  `account_name` VARCHAR(255) NOT NULL,
  `account_number` VARCHAR(100) NOT NULL,
  `merchant_code` VARCHAR(50) DEFAULT NULL,
  `instructions` TEXT DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10. Table des Factures et Historique de Paiement (invoices)
-- Facturation des forfaits, justificatifs, boosts et paiements
-- Architecture prête pour passerelle bancaire/mobile (Stripe, CinetPay, MaxiCash, Flutterwave)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(64) NOT NULL,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` VARCHAR(64) NOT NULL,
  `invoice_type` ENUM('subscription', 'boost', 'advertisement') NOT NULL DEFAULT 'subscription',
  `plan_id` VARCHAR(50) DEFAULT NULL,
  `property_id` VARCHAR(64) DEFAULT NULL,
  `option_id` VARCHAR(50) DEFAULT NULL,
  `advertisement_id` VARCHAR(64) DEFAULT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `amount_cdf` DECIMAL(15, 2) DEFAULT NULL,
  `payment_method_id` VARCHAR(64) DEFAULT NULL,
  `payment_gateway` VARCHAR(50) DEFAULT 'manual_mobile_money',
  `transaction_reference` VARCHAR(100) DEFAULT NULL,
  `gateway_transaction_id` VARCHAR(100) DEFAULT NULL,
  `gateway_metadata` JSON DEFAULT NULL,
  `status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `proof_image_url` TEXT DEFAULT NULL,
  `due_date` DATE NOT NULL,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_invoices_user` (`user_id`),
  INDEX `idx_invoices_status` (`status`),
  INDEX `idx_invoices_type` (`invoice_type`),
  CONSTRAINT `fk_invoices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoices_plan` FOREIGN KEY (`plan_id`) REFERENCES `pricing_plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoices_payment_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 11. Table des Performances & Statistiques (property_analytics)
-- Vues par date, clics WhatsApp, appels, visites, partages
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `property_analytics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `property_id` VARCHAR(64) NOT NULL,
  `date` DATE NOT NULL,
  `views_count` INT NOT NULL DEFAULT 0,
  `whatsapp_clicks` INT NOT NULL DEFAULT 0,
  `call_clicks` INT NOT NULL DEFAULT 0,
  `tour_requests` INT NOT NULL DEFAULT 0,
  `shares_count` INT NOT NULL DEFAULT 0,
  UNIQUE KEY `unique_prop_date` (`property_id`, `date`),
  INDEX `idx_analytics_date` (`date`),
  CONSTRAINT `fk_analytics_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 12. Table des Critères & Champs Personnalisés (custom_fields)
-- Fields Builder Engine - Géré STRICTEMENT par l'administrateur
-- Non visible et non modifiable par les utilisateurs ordinaires
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `custom_fields` (
  `id` VARCHAR(64) NOT NULL,
  `field_key` VARCHAR(100) NOT NULL UNIQUE,
  `label_fr` VARCHAR(255) NOT NULL,
  `label_en` VARCHAR(255) DEFAULT NULL,
  `label_ln` VARCHAR(255) DEFAULT NULL,
  `label_sw` VARCHAR(255) DEFAULT NULL,
  `type` ENUM('text', 'number', 'boolean', 'select', 'multiselect', 'area', 'contact', 'private') NOT NULL DEFAULT 'text',
  `field_group` ENUM('specs', 'financial', 'legal', 'features', 'contact', 'general') NOT NULL DEFAULT 'specs',
  `field_options` JSON DEFAULT NULL,
  `unit` VARCHAR(50) DEFAULT NULL,
  `required` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_private` BOOLEAN NOT NULL DEFAULT FALSE,
  `show_in_search` BOOLEAN NOT NULL DEFAULT TRUE,
  `icon` VARCHAR(100) DEFAULT 'Zap',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_custom_fields_group` (`field_group`),
  INDEX `idx_custom_fields_search` (`show_in_search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- DONNÉES PAR DÉFAUT : Critères Personnalisés Spécifiques Kinshasa
-- ----------------------------------------------------------
INSERT INTO `custom_fields` (`id`, `field_key`, `label_fr`, `label_en`, `type`, `field_group`, `field_options`, `unit`, `required`, `is_private`, `show_in_search`, `icon`)
VALUES
  ('field_distance_fleuve', 'distance_fleuve', 'Proximité Fleuve Congo / Centre Gombe', 'Congo River / Gombe Proximity', 'text', 'general', NULL, 'm / km', FALSE, FALSE, TRUE, 'Compass'),
  ('field_eau_forage', 'eau_forage', 'Approvisionnement en Eau & Forage', 'Water Supply & Borehole', 'select', 'specs', '["Régideso 24/7", "Forage privé avec surpresseur", "Cuve citerne réserve 5000L", "Mixte Régideso + Forage"]', NULL, FALSE, FALSE, TRUE, 'Droplet'),
  ('field_electricite_autonomie', 'electricite_autonomie', 'Électricité & Autonomie (Groupe / Solaire)', 'Electricity & Solar Autonomy', 'select', 'specs', '["SNEL + Groupe électrogène automatique", "Système Solaire Hybride avec Batteries", "SNEL stable ligne prioritaire Gombe", "Groupe de secours agence"]', NULL, FALSE, FALSE, TRUE, 'Zap'),
  ('field_titre_foncier', 'titre_foncier_type', 'Type de Titre Foncier Certifié RDC', 'Certified Land Title Type', 'select', 'legal', '["Certificat d\\'Enregistrement Inattaquable", "Contrat de Concession Ordinaire", "Arrêté Ministériel d\\'Attribution"]', NULL, TRUE, FALSE, TRUE, 'FileText'),
  ('field_securite_gardiennage', 'securite_gardiennage', 'Sécurité & Gardiennage Kinshasa', 'Security & Guarding Services', 'multiselect', 'features', '["Gardiennage armé 24/7 (Delta / Top Sécurité)", "Clôture électrifiée haute tension", "Vidéosurveillance CCTV HD", "Interphone & Portail motorisé"]', NULL, FALSE, FALSE, TRUE, 'ShieldCheck'),
  ('field_climatisation_type', 'climatisation_type', 'Type de Climatisation', 'Air Conditioning Type', 'select', 'features', '["Split Inverter dans toutes les pièces", "Climatisation centrale", "Pré-installation câblée", "Ventilateurs de plafond"]', NULL, FALSE, FALSE, TRUE, 'Wind'),
  ('field_commission_agence', 'commission_agence_pourcent', 'Taux Commission Agence RDC (%)', 'Agency Commission Rate (%)', 'number', 'financial', NULL, '%', FALSE, TRUE, FALSE, 'Percent'),
  ('field_contact_cadastre', 'contact_cadastre_reference', 'Référence Cadastrale / Notaire', 'Cadastral Reference / Notary', 'contact', 'legal', NULL, NULL, FALSE, TRUE, FALSE, 'UserCheck')
ON DUPLICATE KEY UPDATE `label_fr` = VALUES(`label_fr`);

-- ----------------------------------------------------------
-- DONNÉES PAR DÉFAUT : Formules de Tarification Immobilières Kinshasa
-- ----------------------------------------------------------
INSERT INTO `pricing_plans` (`id`, `name`, `description`, `category`, `badge`, `price_usd`, `price_cdf`, `billing_period`, `max_listings`, `max_featured_listings`, `has_verified_badge`, `has_crm_leads`, `has_priority_support`, `is_active`)
VALUES
  ('starter', 'Annonce Gratuite Particulier', 'Idéal pour les propriétaires souhaitant publier leurs biens sans aucun frais ni engagement.', 'individual', 'Gratuit', 0.00, 0.00, 'monthly', 3, 0, FALSE, FALSE, FALSE, TRUE),
  ('pro', 'Pro Courtier Indépendant', 'Pour courtiers indépendants actifs à Kinshasa avec badge vérifié et gestion prioritaire des leads.', 'individual', 'Courtier Pro', 29.00, 81200.00, 'monthly', 25, 3, TRUE, TRUE, FALSE, TRUE),
  ('agency', 'Agence Immobilière Partenaire', 'Visibilité maximale pour agences immobilières avec agents illimités, CRM et vitrine dédiée.', 'agency', 'Agence Certifiée', 79.00, 221200.00, 'monthly', 100, 10, TRUE, TRUE, TRUE, TRUE),
  ('enterprise', 'Promoteur Immobilier & Constructeur VIP', 'Pour promoteurs fonciers, lotissements et grands chantiers avec bannières sponsorisées et multi-diffusion.', 'promoter', 'Promoteur VIP', 149.00, 417200.00, 'monthly', 500, 30, TRUE, TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `category` = VALUES(`category`), `badge` = VALUES(`badge`);

-- ----------------------------------------------------------
-- DONNÉES PAR DÉFAUT : Options de Visibilité à la carte (Boosts)
-- ----------------------------------------------------------
INSERT INTO `visibility_options` (`id`, `name`, `slug`, `description`, `boost_type`, `duration_days`, `price_usd`, `price_cdf`, `badge_text`, `icon`, `is_active`)
VALUES
  ('opt_featured_7d', 'Mise en Avant 7 jours', 'mise_en_avant_7d', 'Positionnement en tête de page d\'accueil et carrousel prioritaire pendant 7 jours.', 'featured', 7, 10.00, 28000.00, 'En Vedette ⭐', 'Sparkles', TRUE),
  ('opt_premium_30d', 'Pack Annonce Premium 30 jours', 'annonce_premium_30d', 'Affichage permanent avec cadre doré, badge Premium, priorité maximale et 3x plus d\'appels.', 'premium', 30, 25.00, 70000.00, '👑 Annonce Premium', 'Crown', TRUE),
  ('opt_urgent_14d', 'Badge Vente / Location Urgente', 'badge_urgent_14d', 'Bandeau rouge d\'urgence pour attirer immédiatement les acheteurs et locataires sérieux.', 'urgent', 14, 8.00, 22400.00, '⚡ Urgent', 'Zap', TRUE),
  ('opt_refresh_bump', 'Remontée Immédiate en Tête', 'remontee_tete', 'Actualise la date de votre annonce pour la replacer tout en haut des résultats de recherche récents.', 'refresh', 1, 5.00, 14000.00, 'Top Liste', 'ArrowUpCircle', TRUE),
  ('opt_social_blast', 'Diffusion Réseaux & WhatsApp Kinimmo', 'diffusion_reseaux', 'Publication sponsorisée sur la communauté Facebook Kinimmo et diffusion WhatsApp VIP.', 'social_blast', 14, 35.00, 98000.00, 'Multi-Canal VIP', 'Share2', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price_usd` = VALUES(`price_usd`);

-- ----------------------------------------------------------
-- DONNÉES PAR DÉFAUT : Agences Immobilières Agréées Kinshasa
-- ----------------------------------------------------------
INSERT INTO `agencies` (`id`, `name`, `logo`, `address`, `city`, `commune`, `phone`, `whatsapp`, `email`, `website`, `manager_name`, `rccm`, `id_nat`, `nif`, `description`, `is_verified`, `subscription_status`, `is_hidden`)
VALUES
  ('agency_congo_luxury', 'Congo Luxury Homes & Development', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&auto=format&fit=crop&q=80', 'Boulevard du 30 Juin, Immeuble Horizon 5ème niveau, Gombe', 'Kinshasa', 'Gombe', '+243 81 000 0001', '+243 81 000 0001', 'contact@congoluxuryhomes.cd', 'https://congoluxuryhomes.cd', 'Dieudonné Mwamba', 'CD/KIN/RCCM/22-B-01452', '01-83-N48201L', 'A1239845Y', 'Leader de l\'immobilier haut standing et des résidences diplomatiques à Kinshasa Gombe et Ngaliema. Vente de villas, duplex avec vue sur le fleuve et gestion sécurisée de patrimoine foncier.', TRUE, 'Active', FALSE),
  ('agency_immo_kinshasa', 'Immo Kin Gombe SARL', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop&q=80', 'Avenue de la Justice, En face du Palais de Justice, Gombe', 'Kinshasa', 'Gombe', '+243 82 123 4567', '+243 82 123 4567', 'info@immokingombe.cd', 'https://immokingombe.cd', 'Patrick Kalombo', 'CD/KIN/RCCM/20-B-08921', '01-75-M19028K', 'B8721903X', 'Cabinet de courtage et de conseil immobilier d\'affaires. Spécialisé dans la location d\'immeubles de bureaux pour multinationales, appartements meublés et concessions foncières titrées.', TRUE, 'Active', FALSE),
  ('agency_fleuve_habitat', 'Agence Immobilière Fleuve Congo', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop&q=80', 'Avenue Colonel Mondjiba, Galerie Saint-Pierre, Ngaliema', 'Kinshasa', 'Ngaliema', '+243 99 876 5432', '+243 99 876 5432', 'contact@fleuvecongoimmo.cd', 'https://fleuvecongoimmo.cd', 'Sarah Mbuyi', 'CD/KIN/RCCM/21-B-03419', '01-92-K38192P', 'C4512987Z', 'Spécialiste des propriétés résidentielles haut de gamme à Ngaliema : Macampagne, Mont Fleury, Binza Pigeon et Kintambo. Vérification systématique des certificats d\'enregistrement au cadastre.', TRUE, 'Active', FALSE),
  ('agency_limete_prestige', 'Limete Prestige & Foncier RDC', 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400&auto=format&fit=crop&q=80', '7ème Rue Limete Résidentiel, Kinshasa', 'Kinshasa', 'Limete', '+243 85 555 4321', '+243 85 555 4321', 'limete@prestige-rdc.cd', 'https://limete-prestige.cd', 'Alain Kasongo', 'CD/KIN/RCCM/23-B-07611', '01-44-R29381M', 'D9012345K', 'Expertise immobilière à Limete Résidentiel et Industriel. Terrains constructibles, concessions industrielles, entrepôts sécurisés et résidences familiales de prestige.', TRUE, 'Active', FALSE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ----------------------------------------------------------
-- DONNÉES PAR DÉFAUT : Régie Publicitaire & Bannières Partenaires Immobilier & Habitat
-- ----------------------------------------------------------
INSERT INTO `advertisements` (`id`, `title`, `advertiser_name`, `advertiser_contact`, `advertiser_email`, `category`, `placement`, `image_url`, `target_url`, `alt_text`, `price_usd`, `start_date`, `end_date`, `impressions_count`, `clicks_count`, `is_active`)
VALUES
  ('ad_promoteur_01', 'Congo Luxury Homes - Villas & Appartements Haut Standing Gombe', 'Congo Luxury Homes SARL', '+243 810 000 001', 'contact@congoluxuryhomes.cd', 'real_estate', 'home_hero', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80', 'https://wa.me/243810000001', 'Promoteur Immobilier Haut Standing Kinshasa Gombe', 200.00, '2026-01-01', '2026-12-31', 1450, 89, TRUE),
  ('ad_construction_02', 'Kin Bâtisseurs SARL - Construction Gros Œuvre, Forage & Finition', 'Kin Bâtisseurs Génie Civil', '+243 990 000 002', 'contact@kinbatisseurs.cd', 'construction', 'search_top', 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=1200&auto=format&fit=crop&q=80', 'https://wa.me/243990000002', 'Entreprise de Construction et Rénovation Kinshasa', 150.00, '2026-01-01', '2026-12-31', 980, 54, TRUE),
  ('ad_banque_03', 'Rawbank RDC - Crédit Immobilier & Financement de Terrain', 'Rawbank Banque RDC', '+243 890 000 003', 'immo@rawbank.cd', 'banking', 'sidebar', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80', 'https://wa.me/243890000003', 'Crédit Immobilier & Caution Locative RDC', 120.00, '2026-01-01', '2026-12-31', 640, 31, TRUE)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- ----------------------------------------------------------
-- DONNÉES PAR DÉFAUT : Moyens de Paiement Locaux Kinshasa
-- ----------------------------------------------------------
INSERT INTO `payment_methods` (`id`, `provider`, `account_name`, `account_number`, `merchant_code`, `instructions`, `is_active`)
VALUES
  ('pm_mpesa', 'mpesa', 'KINIMMO SARL - Vodacom M-Pesa', '+243 810 000 000', '123456', 'Envoyer le montant exact via M-Pesa puis insérer le code de transaction ou téléverser la capture du SMS.', TRUE),
  ('pm_airtel', 'airtel', 'KINIMMO SARL - Airtel Money', '+243 990 000 000', '789012', 'Paiement direct via Airtel Money RDC. Indiquer votre numéro de facture en référence.', TRUE),
  ('pm_orange', 'orange', 'KINIMMO SARL - Orange Money', '+243 890 000 000', '345678', 'Paiement via Orange Money Kinshasa.', TRUE),
  ('pm_rawbank', 'bank_transfer', 'KINIMMO RDC - Rawbank Kinshasa Gombe', '01002-00012345678-90', NULL, 'Virement bancaire ou versement au guichet Rawbank. Joindre le bordereau de versement comme preuve.', TRUE)
ON DUPLICATE KEY UPDATE `account_name` = VALUES(`account_name`);

-- ----------------------------------------------------------
-- Création du compte administrateur sécurisé :
-- Pour créer votre propre administrateur sécurisé (sans mot de passe démo) :
-- Exécutez dans le dossier server/ :
-- node scripts/create-admin.js votre_email@domaine.cd VotreMotDePasseSecret! "Votre Nom"
-- ----------------------------------------------------------

-- ==========================================================
-- MODULE COMPLET DE GESTION PUBLICITAIRE (PARTENAIRES & ADSENSE)
-- ==========================================================

-- ----------------------------------------------------------
-- 10a. Table des Partenaires Publicitaires (ad_partners)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ad_partners` (
  `id` VARCHAR(64) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `rccm_nif` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_partners_status` (`status`),
  INDEX `idx_partners_company` (`company_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10b. Table des Emplacements Publicitaires (ad_placements)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ad_placements` (
  `id` VARCHAR(50) NOT NULL, -- 'home_top', 'home_middle', 'property_top', etc.
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `width` INT NOT NULL DEFAULT 1200,
  `height` INT NOT NULL DEFAULT 300,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `allow_google_adsense` BOOLEAN NOT NULL DEFAULT TRUE,
  `adsense_slot_id` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_placements_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10c. Table des Campagnes Publicitaires (ad_campaigns)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ad_campaigns` (
  `id` VARCHAR(64) NOT NULL,
  `partner_id` VARCHAR(64) NOT NULL,
  `placement_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `image_url` TEXT NOT NULL,
  `target_url` TEXT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `price_usd` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `price_cdf` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('draft', 'active', 'paused', 'expired', 'archived') NOT NULL DEFAULT 'active',
  `max_impressions` INT NOT NULL DEFAULT 0, -- 0 = illimité
  `max_clicks` INT NOT NULL DEFAULT 0,      -- 0 = illimité
  `priority` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_campaigns_status` (`status`),
  INDEX `idx_campaigns_dates` (`start_date`, `end_date`),
  INDEX `idx_campaigns_partner` (`partner_id`),
  INDEX `idx_campaigns_placement` (`placement_id`),
  CONSTRAINT `fk_campaigns_partner` FOREIGN KEY (`partner_id`) REFERENCES `ad_partners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_campaigns_placement` FOREIGN KEY (`placement_id`) REFERENCES `ad_placements` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10d. Table des Impressions Publicitaires (ad_impressions)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ad_impressions` (
  `id` VARCHAR(64) NOT NULL,
  `campaign_id` VARCHAR(64) NOT NULL,
  `placement_id` VARCHAR(50) NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `referer` TEXT DEFAULT NULL,
  `viewed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_impressions_campaign` (`campaign_id`),
  INDEX `idx_impressions_placement` (`placement_id`),
  INDEX `idx_impressions_date` (`viewed_at`),
  CONSTRAINT `fk_impressions_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_impressions_placement` FOREIGN KEY (`placement_id`) REFERENCES `ad_placements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10e. Table des Clics Publicitaires (ad_clicks)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ad_clicks` (
  `id` VARCHAR(64) NOT NULL,
  `campaign_id` VARCHAR(64) NOT NULL,
  `placement_id` VARCHAR(50) NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `clicked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_clicks_campaign` (`campaign_id`),
  INDEX `idx_clicks_placement` (`placement_id`),
  INDEX `idx_clicks_date` (`clicked_at`),
  CONSTRAINT `fk_clicks_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_clicks_placement` FOREIGN KEY (`placement_id`) REFERENCES `ad_placements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10f. Table des Paiements Partenaires (ad_payments)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ad_payments` (
  `id` VARCHAR(64) NOT NULL,
  `partner_id` VARCHAR(64) NOT NULL,
  `campaign_id` VARCHAR(64) DEFAULT NULL,
  `amount_usd` DECIMAL(10, 2) NOT NULL,
  `amount_cdf` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('mpesa', 'airtel', 'orange', 'bank_transfer', 'card', 'cash') NOT NULL,
  `transaction_reference` VARCHAR(100) DEFAULT NULL,
  `payment_date` DATE NOT NULL,
  `status` ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'completed',
  `notes` TEXT DEFAULT NULL,
  `recorded_by_user_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_payments_partner` (`partner_id`),
  INDEX `idx_payments_campaign` (`campaign_id`),
  INDEX `idx_payments_status` (`status`),
  CONSTRAINT `fk_payments_partner` FOREIGN KEY (`partner_id`) REFERENCES `ad_partners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payments_recorder` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Initialisation des 8 Emplacements Publicitaires Officiels
-- ----------------------------------------------------------
INSERT INTO `ad_placements` (`id`, `name`, `description`, `width`, `height`, `is_active`, `allow_google_adsense`, `adsense_slot_id`)
VALUES
  ('home_top', 'Page d\'Accueil - Bannière Principale Haut', 'Positionnée au sommet de la page d\'accueil sous le hero search.', 1200, 250, TRUE, TRUE, '1001234567'),
  ('home_middle', 'Page d\'Accueil - Section Centrale Flux', 'Insérée entre les propriétés vedettes et les communes prisées.', 1200, 200, TRUE, TRUE, '1001234568'),
  ('property_top', 'Détail Propriété - Tête de Fiche', 'Affichée directement au-dessus des photos de la propriété.', 800, 150, TRUE, TRUE, '2001234561'),
  ('property_middle', 'Détail Propriété - Milieu Descriptif', 'Située entre la description détaillée et les caractéristiques techniques.', 800, 180, TRUE, TRUE, '2001234562'),
  ('property_bottom', 'Détail Propriété - Bas de Page / Contact', 'Au-dessus du formulaire de contact agent et biens similaires.', 800, 150, TRUE, TRUE, '2001234563'),
  ('search_top', 'Résultats Recherche - En-tête', 'Bannière panoramique affichée au-dessus de la liste des résultats filtrés.', 1200, 180, TRUE, TRUE, '3001234561'),
  ('search_middle', 'Résultats Recherche - Au Cœur du Flux (In-Feed)', 'Insérée après la 3ème annonce dans la grille des résultats.', 600, 300, TRUE, TRUE, '3001234562'),
  ('agency_top', 'Annuaire des Agences - En-tête', 'Bannière en haut de la liste des agences et promoteurs de Kinshasa.', 1200, 200, TRUE, TRUE, '4001234561')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

-- ----------------------------------------------------------
-- 11. Table des Projets d'Exception & Mises en Avant (Hero Showcase Safricode Style)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hero_showcase_slides` (
  `id` VARCHAR(64) NOT NULL,
  `badge_category` VARCHAR(100) NOT NULL DEFAULT 'RÉSIDENTIEL & COMMERCIAL',
  `badge_location` VARCHAR(100) NOT NULL DEFAULT 'LA GOMBE, KINSHASA',
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `property_type` VARCHAR(100) DEFAULT 'Appartement de Prestige',
  `commune` VARCHAR(100) DEFAULT 'Gombe',
  `property_id` VARCHAR(64) DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `display_order` INT NOT NULL DEFAULT 1,
  `contact_name` VARCHAR(150) DEFAULT NULL,
  `contact_phone` VARCHAR(50) DEFAULT NULL,
  `contact_whatsapp` VARCHAR(50) DEFAULT NULL,
  `contact_email` VARCHAR(150) DEFAULT NULL,
  `contact_role` VARCHAR(100) DEFAULT NULL,
  `legal_status` VARCHAR(255) DEFAULT NULL,
  `floors` VARCHAR(50) DEFAULT NULL,
  `units` VARCHAR(50) DEFAULT NULL,
  `parking` VARCHAR(50) DEFAULT NULL,
  `surface` VARCHAR(50) DEFAULT NULL,
  `amenities` JSON DEFAULT NULL,
  `price_info` VARCHAR(100) DEFAULT NULL,
  `delivery_date` VARCHAR(100) DEFAULT 'Disponible immédiatement',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_showcase_active_order` (`is_active`, `display_order`),
  CONSTRAINT `fk_showcase_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `hero_showcase_slides` (`id`, `badge_category`, `badge_location`, `title`, `subtitle`, `description`, `image_url`, `property_type`, `commune`, `is_active`, `display_order`, `contact_name`, `contact_phone`, `contact_whatsapp`, `contact_role`, `floors`, `units`, `parking`, `surface`, `amenities`, `price_info`, `delivery_date`)
VALUES
  ('slide_tour_iconique', 'RÉSIDENTIEL & COMMERCIAL', 'LA GOMBE, KINSHASA', 'L''ADRESSE : L''EXCELLENCE ARCHITECTURALE AU SERVICE DE VOTRE CONFORT', 'LA TOUR ICONIQUE QUI TUTOIE LE SOMMET À KINSHASA', '23 étages, 120 appartements de grand luxe, 3 penthouses exclusifs avec terrasses panoramiques, 8 commerces au rez-de-chaussée, 5 niveaux de parking sécurisé.', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=85', 'Appartement de Prestige', 'Gombe', TRUE, 1, 'Service Commercial - Tour Iconique', '+243 81 000 0001', '+243 81 000 0001', 'Promoteur Officiel', '23 Étages', '120 Unités', '5 Niveaux', '110 à 480 m²', '["Vue panoramique sur le Fleuve Congo", "Piscine suspendue au 15ème étage", "Autonomie énergétique H24"]', 'À partir de $280,000 ou $3,500/mois', 'Clés en mains disponibles'),
  ('slide_residence_dina', 'RÉSIDENTIEL DE PRESTIGE', 'LA GOMBE', 'RÉSIDENCE DINA : VOS EXIGENCES, NOTRE PRIORITÉ ABSOLUE', 'LA RÉSIDENCE CONTEMPORAINE SYNONYME D''ÉLÉGANCE ET DE SÉRÉNITÉ', 'Appartements premium de 2, 3 et 4 chambres, 3 niveaux de parking intégrés, ascenseurs panoramiques et vaste terrasse paysagère.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=85', 'Résidence Contemporaine', 'Gombe', TRUE, 2, 'Agence Immo Kin Gombe SARL', '+243 82 123 4567', '+243 82 123 4567', 'Agence Mandataire Exclusif', '12 Étages', '36 Appartements', '3 Niveaux', '140 à 320 m²', '["Marbre italien et boiseries nobles", "Cuisines équipées haut de gamme", "Groupe insonorisé et forage purifié"]', 'À partir de $320,000', 'Livraison immédiate'),
  ('slide_villas_fleuve', 'VILLAS DIPLOMATIQUES', 'NGALIEMA, MACAMPAGNE', 'VILLAS DU FLEUVE : L''ART DE VIVRE DANS UN ÉCRIN DE VERDURE', 'PROPRIÉTÉS PRIVÉES EXCLUSIVES AVEC VUE IMPRENABLE', 'Ensemble de villas d''architecte de 450 à 750 m² sur parcelles titrées, piscines privées à débordement, jardins tropicaux et sécurité 24/7.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop&q=85', 'Villa Contemporaine', 'Ngaliema', TRUE, 3, 'Cabinet Fleuve Habitat & Prestige', '+243 99 876 5432', '+243 99 876 5432', 'Courtier Conseil Agréé', '2 Niveaux', '8 Villas Uniques', '4 Véhicules/Villa', '550 m² habitables', '["Piscine miroir avec pool house", "Périmètre diplomatique sécurisé", "Titre foncier et certificat notarié"]', 'Sur demande ($850,000 - $1,600,000)', 'Disponible immédiatement')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `description` = VALUES(`description`);

-- ----------------------------------------------------------
-- 12. Table des Paramètres Généraux & Service Client VIP (site_settings)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `site_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` LONGTEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `site_settings` (`setting_key`, `setting_value`, `category`, `description`)
VALUES
  ('site_name', 'Kin Immobilier (Kinimmo)', 'general', 'Nom officiel du portail immobilier'),
  ('contact_email', 'joosskalu72@gmail.com', 'contact', 'Email officiel de contact Kinimmo'),
  ('support_phone', '+243 84 529 4616', 'contact', 'Numéro de téléphone direct officiel Kinshasa'),
  ('support_whatsapp', '+243 84 529 4616', 'contact', 'Numéro WhatsApp officiel Kinshasa'),
  ('office_address', 'Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC', 'contact', 'Adresse physique du siège social à Kinshasa'),
  ('working_hours', 'Lundi - Samedi : 08h00 - 18h30 | Urgences VIP 24h/7j', 'contact', 'Plages horaires d''assistance'),
  ('exchange_rate_usd_cdf', '2850', 'financial', 'Taux de change indicatif 1 USD en CDF'),
  ('auto_approve_properties', 'false', 'general', 'Modération préalable des annonces par l''administrateur'),
  ('vip_enabled', 'true', 'vip_concierge', 'Activation du widget et service Conciergerie Partenariats B2B'),
  ('vip_title', 'Conciergerie Partenariats, Agences & Relations B2B', 'vip_concierge', 'Titre affiché pour le service Partenaires'),
  ('vip_subtitle', 'Espace Dédié Agences, Agents & Promoteurs • Kinshasa', 'vip_concierge', 'Sous-titre et badge d''affiliation'),
  ('vip_phone', '+243 84 529 4616', 'vip_concierge', 'Numéro d''appel direct pour les relations professionnelles'),
  ('vip_whatsapp', '+243 84 529 4616', 'vip_concierge', 'Numéro WhatsApp direct pour les relations professionnelles'),
  ('vip_email', 'joosskalu72@gmail.com', 'vip_concierge', 'Email dédié aux partenariats'),
  ('vip_description', 'Vous êtes une agence immobilière agréée, un agent indépendant, un promoteur de programmes neufs ou un propriétaire foncier ? Rejoignez le réseau officiel Kinimmo et développons ensemble vos transactions et partenariats.', 'vip_concierge', 'Texte de présentation dans la bulle Partenaires'),
  ('vip_message', 'Bonjour KINIMMO Relations Partenaires, je souhaite échanger sur une opportunité de collaboration professionnelle.', 'vip_concierge', 'Message pré-rempli par défaut sur WhatsApp'),
  ('vip_agent_message', 'Bonjour KINIMMO Partenariats, je suis une agence/un agent immobilier à Kinshasa et je souhaite collaborer avec votre plateforme pour diffuser mes annonces et mandats.', 'vip_concierge', 'Message WhatsApp pré-rempli pour Agences & Agents'),
  ('vip_partner_message', 'Bonjour KINIMMO Partenariats, je souhaite vous présenter un projet immobilier / programme neuf / partenariat d''affaires.', 'vip_concierge', 'Message WhatsApp pré-rempli pour Partenaires & Promoteurs')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- ----------------------------------------------------------
-- 13. Table des Demandes de Conciergerie Immobilière (concierge_requests)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `concierge_requests` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `project_type` VARCHAR(100) NOT NULL,
  `property_type` VARCHAR(100) NOT NULL,
  `commune` VARCHAR(100) NOT NULL,
  `quartier` VARCHAR(150) DEFAULT NULL,
  `budget_min` DECIMAL(15, 2) DEFAULT NULL,
  `budget_max` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `bedrooms` INT DEFAULT NULL,
  `bathrooms` INT DEFAULT NULL,
  `parking` BOOLEAN NOT NULL DEFAULT FALSE,
  `furnished` BOOLEAN NOT NULL DEFAULT FALSE,
  `services` JSON DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(255) NOT NULL,
  `status` ENUM('new', 'searching', 'properties_found', 'visit_scheduled', 'negotiation', 'completed', 'cancelled') NOT NULL DEFAULT 'new',
  `assigned_agent_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_concierge_user_id` (`user_id`),
  INDEX `idx_concierge_status` (`status`),
  INDEX `idx_concierge_commune` (`commune`),
  INDEX `idx_concierge_assigned_agent` (`assigned_agent_id`),
  INDEX `idx_concierge_created_at` (`created_at`),
  CONSTRAINT `fk_concierge_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_concierge_assigned_agent` FOREIGN KEY (`assigned_agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 14. Table des Visites Immobilières Planifiées (property_visits)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `property_visits` (
  `id` VARCHAR(64) NOT NULL,
  `request_id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) DEFAULT NULL,
  `agent_id` VARCHAR(64) DEFAULT NULL,
  `visit_date` DATE NOT NULL,
  `visit_time` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled') NOT NULL DEFAULT 'scheduled',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_visits_request_id` (`request_id`),
  INDEX `idx_visits_property_id` (`property_id`),
  INDEX `idx_visits_agent_id` (`agent_id`),
  INDEX `idx_visits_date` (`visit_date`),
  INDEX `idx_visits_status` (`status`),
  CONSTRAINT `fk_visits_request` FOREIGN KEY (`request_id`) REFERENCES `concierge_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_visits_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_visits_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 15. Table des Notifications & File d'attente (notifications)
-- Architecture de préparation d'envois différés (Client & Agent)
-- Ne contacte aucune API externe sans accord préalable
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `event_type` ENUM(
    'client_request_confirmation',
    'agent_request_assigned',
    'visit_confirmation',
    'visit_reminder',
    'status_update',
    'general'
  ) NOT NULL,
  `recipient_type` ENUM('client', 'agent', 'admin', 'user') NOT NULL,
  `recipient_id` VARCHAR(64) DEFAULT NULL,
  `recipient_name` VARCHAR(255) NOT NULL,
  `recipient_email` VARCHAR(255) DEFAULT NULL,
  `recipient_phone` VARCHAR(50) DEFAULT NULL,
  `channel` ENUM('email', 'whatsapp', 'sms', 'in_app') NOT NULL DEFAULT 'email',
  `title` VARCHAR(255) NOT NULL,
  `content_text` TEXT NOT NULL,
  `content_html` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'queued', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'queued',
  `metadata` JSON DEFAULT NULL,
  `scheduled_for` TIMESTAMP NULL DEFAULT NULL,
  `sent_at` TIMESTAMP NULL DEFAULT NULL,
  `retry_count` INT NOT NULL DEFAULT 0,
  `error_message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notif_event_type` (`event_type`),
  INDEX `idx_notif_recipient` (`recipient_type`, `recipient_id`),
  INDEX `idx_notif_status` (`status`),
  INDEX `idx_notif_scheduled` (`scheduled_for`),
  INDEX `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Réactivation des vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;
