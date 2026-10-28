-- ==========================================================
-- MIGRATION KINIMMO : RÈGLES DES ANNONCES & ESPACE AGENCES
-- Date : 2026-10-13
-- Compatible MySQL 8.0 / MariaDB 10.3+ (Hostinger cPanel/hPanel)
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- 1. Évolution de la table des Propriétés (properties)
-- Statuts stricts : DRAFT, PENDING_REVIEW, PUBLISHED, RENTED, SOLD, ARCHIVED
-- ----------------------------------------------------------
ALTER TABLE `properties`
  ADD COLUMN IF NOT EXISTS `listing_status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RENTED', 'SOLD', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS `assigned_agent_id` VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `assigned_agent_name` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `status_history` JSON DEFAULT NULL;

-- Index pour optimiser les filtres de statut dans le tableau de bord
CREATE INDEX IF NOT EXISTS `idx_properties_listing_status` ON `properties` (`listing_status`);
CREATE INDEX IF NOT EXISTS `idx_properties_assigned_agent` ON `properties` (`assigned_agent_id`);

-- ----------------------------------------------------------
-- 2. Table des Collaborateurs d'Agence (agency_collaborators)
-- Gestion des équipes, rôles et permissions fines
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agency_collaborators` (
  `id` VARCHAR(64) NOT NULL,
  `agency_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `avatar` TEXT DEFAULT NULL,
  `role` ENUM('agency_owner', 'agency_manager', 'agency_agent') NOT NULL DEFAULT 'agency_agent',
  `can_edit_all_properties` BOOLEAN NOT NULL DEFAULT FALSE,
  `can_assign_properties` BOOLEAN NOT NULL DEFAULT FALSE,
  `can_assign_leads` BOOLEAN NOT NULL DEFAULT FALSE,
  `can_view_billing` BOOLEAN NOT NULL DEFAULT FALSE,
  `can_manage_team` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('active', 'invited', 'suspended') NOT NULL DEFAULT 'active',
  `invited_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `joined_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_collab_agency` (`agency_id`),
  INDEX `idx_collab_user` (`user_id`),
  INDEX `idx_collab_role` (`role`),
  CONSTRAINT `fk_collab_agency` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. Table des Transactions et Suivi Commercial d'Agence (agency_transactions)
-- Pipeline des ventes et locations conclues
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agency_transactions` (
  `id` VARCHAR(64) NOT NULL,
  `agency_id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) NOT NULL,
  `property_title` VARCHAR(255) NOT NULL,
  `agent_id` VARCHAR(64) NOT NULL,
  `agent_name` VARCHAR(255) NOT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `client_contact` VARCHAR(100) DEFAULT NULL,
  `type` ENUM('sale', 'rent') NOT NULL DEFAULT 'sale',
  `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `commission_rate` DECIMAL(5, 2) DEFAULT 5.00,
  `commission_amount` DECIMAL(15, 2) DEFAULT 0.00,
  `status` ENUM('negotiating', 'under_contract', 'closed', 'cancelled') NOT NULL DEFAULT 'closed',
  `notes` TEXT DEFAULT NULL,
  `closed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_trans_agency` (`agency_id`),
  INDEX `idx_trans_property` (`property_id`),
  INDEX `idx_trans_agent` (`agent_id`),
  INDEX `idx_trans_status` (`status`),
  CONSTRAINT `fk_trans_agency` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
