-- =========================================================================
-- KINIMMO - SCRIPT DE RÉINITIALISATION COMPLÈTE (BASE DE DONNÉES VIERGE)
-- =========================================================================
-- Ce script vide (TRUNCATE) l'ensemble des tables de test et de démonstration
-- pour repartir sur une base de données 100% propre et vierge.
-- Les tables et leurs structures sont intégralement préservées.
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Vider les annonces et images
TRUNCATE TABLE `property_images`;
TRUNCATE TABLE `properties`;

-- 2. Vider les comptes utilisateurs, agents et agences
TRUNCATE TABLE `users`;
TRUNCATE TABLE `agents`;
TRUNCATE TABLE `agencies`;

-- 3. Vider les demandes, contacts et factures
TRUNCATE TABLE `leads`;
TRUNCATE TABLE `invoices`;
TRUNCATE TABLE `concierge_requests`;

-- 4. Vider les vidéos immersives et signalements
TRUNCATE TABLE `property_videos`;
TRUNCATE TABLE `property_reports`;

-- 5. Vider les statistiques et mises en avant
TRUNCATE TABLE `property_analytics`;
TRUNCATE TABLE `listing_boosts`;
TRUNCATE TABLE `hero_showcase_slides`;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- CONFIRMATION
-- =========================================================================
-- Votre base de données Kinimmo est maintenant 100% vierge.
-- Vous pouvez à présent vous inscrire depuis le site (https://kinimmo.com)
-- pour créer votre propre compte Administrateur ou Agent officiel.
-- =========================================================================
