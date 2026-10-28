-- ==========================================================
-- MIGRATION KINIMMO : MODULE VISITES & SIGNALEMENTS
-- Date : 2026-10-12
-- Compatible MySQL 8.0 / MariaDB 10.3+ (Hostinger)
-- ==========================================================

-- Début de la migration
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table des Vidéos Courtes & Immersives (property_videos)
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
  INDEX `idx_prop_videos_property` (`property_id`),
  INDEX `idx_prop_videos_user` (`user_id`),
  INDEX `idx_prop_videos_status` (`status`),
  INDEX `idx_prop_videos_created` (`created_at`),
  CONSTRAINT `fk_prop_videos_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prop_videos_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table des Signalements de Modération (property_reports)
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
  INDEX `idx_prop_reports_property` (`property_id`),
  INDEX `idx_prop_reports_status` (`status`),
  INDEX `idx_prop_reports_created` (`created_at`),
  CONSTRAINT `fk_prop_reports_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- SCRIPT DE ROLLBACK / ANNULATION RÉVERSIBLE :
-- En cas de besoin de revenir en arrière, exécuter :
--
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP TABLE IF EXISTS `property_reports`;
-- DROP TABLE IF EXISTS `property_videos`;
-- SET FOREIGN_KEY_CHECKS = 1;
-- ==========================================================
