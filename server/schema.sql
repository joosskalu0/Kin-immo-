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

-- Réactivation des vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;
