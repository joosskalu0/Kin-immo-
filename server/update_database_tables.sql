-- ==========================================================
-- SCRIPT DE MISE À NIVEAU DES TABLES MANQUANTES KINIMMO
-- Exécutez ce script dans phpMyAdmin > Onglet "SQL"
-- Base de données : u580134468_Kinimmo
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table des Partenaires Publicitaires (ad_partners)
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

-- 2. Table des Emplacements Publicitaires (ad_placements)
CREATE TABLE IF NOT EXISTS `ad_placements` (
  `id` VARCHAR(50) NOT NULL,
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

-- 3. Table des Campagnes Publicitaires (ad_campaigns)
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
  `max_impressions` INT NOT NULL DEFAULT 0,
  `max_clicks` INT NOT NULL DEFAULT 0,
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

-- 4. Table des Impressions Publicitaires (ad_impressions)
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

-- 5. Table des Clics Publicitaires (ad_clicks)
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

-- 6. Table des Paiements Partenaires (ad_payments)
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

-- Emplacements publicitaires par défaut
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

-- 7. Table des Projets d'Exception & Mises en Avant (hero_showcase_slides)
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

-- 8. Table des Paramètres Généraux (site_settings)
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
  ('vip_phone', '+243 84 529 4616', 'vip_concierge', 'Ligne directe WhatsApp/Appel Conciergerie VIP'),
  ('vip_whatsapp', '+243 84 529 4616', 'vip_concierge', 'WhatsApp direct pour accompagnement premium'),
  ('vip_email', 'joosskalu72@gmail.com', 'vip_concierge', 'Email de correspondance conciergerie'),
  ('vip_description', 'Vous êtes une agence immobilière ou un promoteur à Kinshasa ? Bénéficiez d''un accompagnement sur-mesure.', 'vip_concierge', 'Texte de présentation dans la modal'),
  ('vip_message', 'Bonjour KINIMMO Partenariats, je représente une agence/promoteur et je souhaite collaborer.', 'vip_concierge', 'Message pré-rempli pour WhatsApp')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 9. Table des Demandes de Conciergerie (concierge_requests)
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
  CONSTRAINT `fk_concierge_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table des Visites Immobilières (property_visits)
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
  CONSTRAINT `fk_visits_request` FOREIGN KEY (`request_id`) REFERENCES `concierge_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Table des Notifications (notifications)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `event_type` ENUM('client_request_confirmation', 'agent_request_assigned', 'visit_confirmation', 'visit_reminder', 'status_update', 'general') NOT NULL,
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Table des Vidéos Courtes Kinimmo Visites (property_videos)
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

-- 13. Table des Signalements (property_reports)
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

-- 14. Tables Kinimmo Trust (Vérification et Notariat)
CREATE TABLE IF NOT EXISTS `trust_verifications` (
  `id` VARCHAR(64) NOT NULL,
  `target_type` ENUM('agent', 'agency', 'property') NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `target_name` VARCHAR(255) NOT NULL,
  `applicant_user_id` VARCHAR(64) NOT NULL,
  `applicant_name` VARCHAR(255) NOT NULL,
  `applicant_email` VARCHAR(255) NOT NULL,
  `applicant_phone` VARCHAR(50) DEFAULT NULL,
  `trust_status` ENUM('unverified', 'pending', 'in_progress', 'identity_verified', 'pro_verified', 'property_verified', 'rejected', 'expired', 'suspended') NOT NULL DEFAULT 'unverified',
  `trust_level` VARCHAR(100) DEFAULT NULL,
  `trust_score` INT NOT NULL DEFAULT 0,
  `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `assigned_admin_id` VARCHAR(64) DEFAULT NULL,
  `assigned_admin_name` VARCHAR(255) DEFAULT NULL,
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `rejection_category` VARCHAR(100) DEFAULT NULL,
  `suspension_reason` TEXT DEFAULT NULL,
  `admin_notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_trust_applicant_user` FOREIGN KEY (`applicant_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trust_documents` (
  `id` VARCHAR(64) NOT NULL,
  `verification_id` VARCHAR(64) NOT NULL,
  `doc_type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `document_number` VARCHAR(100) DEFAULT NULL,
  `file_url` TEXT NOT NULL,
  `file_size` VARCHAR(50) DEFAULT NULL,
  `file_mime_type` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `rejection_note` TEXT DEFAULT NULL,
  `verified_by_user_id` VARCHAR(64) DEFAULT NULL,
  `verified_by_name` VARCHAR(255) DEFAULT NULL,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_trust_doc_verif` FOREIGN KEY (`verification_id`) REFERENCES `trust_verifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trust_checks` (
  `id` VARCHAR(64) NOT NULL,
  `verification_id` VARCHAR(64) NOT NULL,
  `check_type` VARCHAR(50) NOT NULL,
  `check_label` VARCHAR(255) NOT NULL,
  `result` ENUM('passed', 'failed', 'pending', 'waived') NOT NULL DEFAULT 'pending',
  `evidence_notes` TEXT DEFAULT NULL,
  `conducted_by_user_id` VARCHAR(64) NOT NULL,
  `conducted_by_name` VARCHAR(255) NOT NULL,
  `conducted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_trust_checks_verif` FOREIGN KEY (`verification_id`) REFERENCES `trust_verifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trust_audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `verification_id` VARCHAR(64) DEFAULT NULL,
  `target_type` ENUM('agent', 'agency', 'property', 'system') NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `admin_user_id` VARCHAR(64) NOT NULL,
  `admin_name` VARCHAR(255) NOT NULL,
  `admin_email` VARCHAR(255) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `previous_status` VARCHAR(50) DEFAULT NULL,
  `new_status` VARCHAR(50) DEFAULT NULL,
  `reason_or_notes` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trust_property_availability` (
  `id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) NOT NULL UNIQUE,
  `property_title` VARCHAR(255) NOT NULL,
  `is_available` BOOLEAN NOT NULL DEFAULT TRUE,
  `availability_status` ENUM('available', 'under_option', 'reserved', 'rented', 'sold', 'withdrawn') NOT NULL DEFAULT 'available',
  `last_confirmed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_confirmed_by_id` VARCHAR(64) NOT NULL,
  `last_confirmed_by_name` VARCHAR(255) NOT NULL,
  `confirmation_method` ENUM('agent_statement', 'physical_visit', 'admin_audit', 'client_feedback') NOT NULL DEFAULT 'agent_statement',
  `next_verification_due` TIMESTAMP NULL DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_trust_prop_avail` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trust_notifications` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `target_type` ENUM('agent', 'agency', 'property') DEFAULT NULL,
  `target_id` VARCHAR(64) DEFAULT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_trust_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
