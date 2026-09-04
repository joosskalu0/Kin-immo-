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
-- Gère les abonnements des courtiers et agences de Kinshasa
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pricing_plans` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
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
  PRIMARY KEY (`id`)
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
-- Facturation des forfaits, justificatifs et statuts
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(64) NOT NULL,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` VARCHAR(64) NOT NULL,
  `plan_id` VARCHAR(50) DEFAULT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `amount_cdf` DECIMAL(15, 2) DEFAULT NULL,
  `payment_method_id` VARCHAR(64) DEFAULT NULL,
  `transaction_reference` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `proof_image_url` TEXT DEFAULT NULL,
  `due_date` DATE NOT NULL,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_invoices_user` (`user_id`),
  INDEX `idx_invoices_status` (`status`),
  CONSTRAINT `fk_invoices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoices_plan` FOREIGN KEY (`plan_id`) REFERENCES `pricing_plans` (`id`) ON DELETE SET NULL,
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
-- DONNÉES PAR DÉFAUT : Formules de Tarification Kinshasa
-- ----------------------------------------------------------
INSERT INTO `pricing_plans` (`id`, `name`, `description`, `price_usd`, `price_cdf`, `billing_period`, `max_listings`, `max_featured_listings`, `has_verified_badge`, `has_crm_leads`, `has_priority_support`, `is_active`)
VALUES
  ('starter', 'Starter Particulier', 'Idéal pour publier vos premières annonces sans engagement.', 0.00, 0.00, 'monthly', 3, 0, FALSE, FALSE, FALSE, TRUE),
  ('pro', 'Pro Courtier Kinshasa', 'Pour courtiers indépendants actifs à Kinshasa avec badge vérifié.', 29.00, 81200.00, 'monthly', 25, 3, TRUE, TRUE, FALSE, TRUE),
  ('agency', 'Agence Immobilière Partenaire', 'Visibilité maximale pour agences avec agents illimités et CRM.', 79.00, 221200.00, 'monthly', 100, 10, TRUE, TRUE, TRUE, TRUE),
  ('enterprise', 'Groupe & Promoteur Immobilier', 'Accompagnement VIP, mise en avant garantie et intégration sur mesure.', 149.00, 417200.00, 'monthly', 500, 30, TRUE, TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

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

-- Réactivation des vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;
