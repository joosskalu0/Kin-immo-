-- ==========================================================
-- KINIMMO - SCRIPT DE RÉSOLUTION IMMÉDIATE DES TABLES MANQUANTES
-- Base de données Hostinger : u580134468_Kinimmo
-- Exécutez ce script dans phpMyAdmin > Onglet "SQL"
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table des Vidéos Courtes Kinimmo Visites (property_videos)
CREATE TABLE IF NOT EXISTS `property_videos` (
  `id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `video_url` TEXT NOT NULL,
  `thumbnail_url` TEXT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('draft', 'pending', 'approved', 'rejected', 'hidden') NOT NULL DEFAULT 'pending',
  `views_count` INT NOT NULL DEFAULT 0,
  `rejection_reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_prop_videos_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table des Signalements (property_reports)
CREATE TABLE IF NOT EXISTS `property_reports` (
  `id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) NOT NULL,
  `reporter_name` VARCHAR(255) DEFAULT NULL,
  `reporter_contact` VARCHAR(100) DEFAULT NULL,
  `reason` VARCHAR(100) NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_prop_reports_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table des Demandes de Conciergerie (concierge_requests)
CREATE TABLE IF NOT EXISTS `concierge_requests` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) DEFAULT NULL,
  `project_type` VARCHAR(100) NOT NULL,
  `property_type` VARCHAR(100) NOT NULL,
  `commune` VARCHAR(100) NOT NULL,
  `quartier` VARCHAR(150) DEFAULT NULL,
  `budget_min` DECIMAL(12, 2) DEFAULT NULL,
  `budget_max` DECIMAL(12, 2) NOT NULL DEFAULT 0,
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
  INDEX `idx_concierge_status` (`status`),
  INDEX `idx_concierge_commune` (`commune`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table des Visites Immobilières (property_visits)
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
  INDEX `idx_visits_req` (`request_id`),
  INDEX `idx_visits_agent` (`agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table des Diapositives Vitrine Hero (hero_showcase_slides)
CREATE TABLE IF NOT EXISTS `hero_showcase_slides` (
  `id` VARCHAR(64) NOT NULL,
  `badge_category` VARCHAR(150) NOT NULL DEFAULT 'RÉSIDENTIEL',
  `badge_location` VARCHAR(150) NOT NULL DEFAULT 'KINSHASA',
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) DEFAULT NULL,
  `description` TEXT NOT NULL,
  `image_url` TEXT NOT NULL,
  `property_type` VARCHAR(100) DEFAULT 'Villa Contemporaine',
  `commune` VARCHAR(100) DEFAULT 'Gombe',
  `property_id` VARCHAR(64) DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `display_order` INT NOT NULL DEFAULT 1,
  `contact_name` VARCHAR(255) DEFAULT 'Conseiller Kinimmo',
  `contact_phone` VARCHAR(50) DEFAULT '+243 81 000 0001',
  `contact_whatsapp` VARCHAR(50) DEFAULT '+243 81 000 0001',
  `contact_email` VARCHAR(255) DEFAULT NULL,
  `contact_role` VARCHAR(150) DEFAULT 'Service Commercial',
  `legal_status` VARCHAR(150) DEFAULT NULL,
  `floors` VARCHAR(50) DEFAULT NULL,
  `units` VARCHAR(50) DEFAULT NULL,
  `parking` VARCHAR(50) DEFAULT NULL,
  `surface` VARCHAR(50) DEFAULT NULL,
  `amenities` JSON DEFAULT NULL,
  `price_info` VARCHAR(150) DEFAULT NULL,
  `delivery_date` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_showcase_active` (`is_active`),
  INDEX `idx_showcase_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Sécurisation de la table properties (Vidéo fluide & Affichage garanti sur la page d'accueil)
ALTER TABLE `properties` MODIFY COLUMN `video_url` TEXT DEFAULT NULL;
ALTER TABLE `properties` MODIFY COLUMN `published` BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE `properties` SET `published` = TRUE WHERE `published` IS NULL OR `published` = FALSE;

-- 6. Sécurisation de la table property_images (Photos HD complètes sans coupure grise)
ALTER TABLE `property_images` MODIFY COLUMN `image_url` LONGTEXT NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
