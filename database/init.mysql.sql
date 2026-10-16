-- =====================================================================
-- LIBNEXA: Relational Database Schema (MySQL 8.0+)
-- Institution: Nasarawa State University, Keffi (NSUK)
-- Description: Physical Library Catalog, Inventory, Circulation & Audit
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `libnexa_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `libnexa_db`;

-- Disable foreign key checks during creation
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `matric_number` VARCHAR(50) NULL UNIQUE,
  `membership_number` VARCHAR(50) NULL UNIQUE,
  `department` VARCHAR(100) NULL,
  `faculty` VARCHAR(100) NULL,
  `phone` VARCHAR(25) NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
  `account_status` VARCHAR(25) NOT NULL DEFAULT 'ACTIVE',
  `email_verified_at` DATETIME NULL,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_matric` (`matric_number`)
) ENGINE=InnoDB;

-- 2. Publishers Table
CREATE TABLE IF NOT EXISTS `publishers` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(150) NOT NULL UNIQUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 3. Authors Table
CREATE TABLE IF NOT EXISTS `authors` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(150) NOT NULL UNIQUE,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 5. Books Table (Titles)
CREATE TABLE IF NOT EXISTS `books` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `isbn` VARCHAR(30) NOT NULL UNIQUE,
  `description` TEXT NOT NULL,
  `publisher_id` VARCHAR(36) NULL,
  `publication_year` INT NULL,
  `edition` VARCHAR(50) NULL,
  `language` VARCHAR(50) NOT NULL DEFAULT 'English',
  `cover_image_url` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_books_title` (`title`),
  INDEX `idx_books_isbn` (`isbn`),
  CONSTRAINT `fk_books_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `publishers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. Book Authors (Many-to-Many)
CREATE TABLE IF NOT EXISTS `book_authors` (
  `book_id` VARCHAR(36) NOT NULL,
  `author_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`book_id`, `author_id`),
  CONSTRAINT `fk_ba_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ba_author` FOREIGN KEY (`author_id`) REFERENCES `authors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Book Categories (Many-to-Many)
CREATE TABLE IF NOT EXISTS `book_categories` (
  `book_id` VARCHAR(36) NOT NULL,
  `category_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`book_id`, `category_id`),
  CONSTRAINT `fk_bc_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bc_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Book Copies (Physical Inventory)
CREATE TABLE IF NOT EXISTS `book_copies` (
  `id` VARCHAR(36) NOT NULL,
  `book_id` VARCHAR(36) NOT NULL,
  `accession_number` VARCHAR(50) NOT NULL UNIQUE,
  `barcode` VARCHAR(50) NULL UNIQUE,
  `shelf_location` VARCHAR(100) NOT NULL,
  `condition` VARCHAR(20) NOT NULL DEFAULT 'GOOD',
  `status` VARCHAR(25) NOT NULL DEFAULT 'AVAILABLE',
  `acquisition_date` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_copies_book` (`book_id`),
  INDEX `idx_copies_status` (`status`),
  INDEX `idx_copies_accession` (`accession_number`),
  CONSTRAINT `fk_copies_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Borrowing Requests
CREATE TABLE IF NOT EXISTS `borrowing_requests` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `book_id` VARCHAR(36) NOT NULL,
  `assigned_copy_id` VARCHAR(36) NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'PENDING',
  `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by` VARCHAR(36) NULL,
  `reviewed_at` DATETIME NULL,
  `rejection_reason` TEXT NULL,
  `collection_deadline` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_br_user` (`user_id`),
  INDEX `idx_br_book` (`book_id`),
  INDEX `idx_br_status` (`status`),
  CONSTRAINT `fk_br_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_br_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_br_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 10. Active & Completed Loans
CREATE TABLE IF NOT EXISTS `loans` (
  `id` VARCHAR(36) NOT NULL,
  `borrowing_request_id` VARCHAR(36) NULL UNIQUE,
  `user_id` VARCHAR(36) NOT NULL,
  `book_copy_id` VARCHAR(36) NOT NULL,
  `borrowed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_at` DATETIME NOT NULL,
  `returned_at` DATETIME NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `return_condition` VARCHAR(20) NULL,
  `return_notes` TEXT NULL,
  `processed_by` VARCHAR(36) NULL,
  `return_processed_by` VARCHAR(36) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_loans_user` (`user_id`),
  INDEX `idx_loans_copy` (`book_copy_id`),
  INDEX `idx_loans_status` (`status`),
  INDEX `idx_loans_due` (`due_at`),
  CONSTRAINT `fk_loans_request` FOREIGN KEY (`borrowing_request_id`) REFERENCES `borrowing_requests` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_loans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_loans_copy` FOREIGN KEY (`book_copy_id`) REFERENCES `book_copies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_loans_librarian` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_loans_return_librarian` FOREIGN KEY (`return_processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. Reservations Queue
CREATE TABLE IF NOT EXISTS `reservations` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `book_id` VARCHAR(36) NOT NULL,
  `assigned_copy_id` VARCHAR(36) NULL,
  `queue_position` INT NOT NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'PENDING',
  `reserved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `available_at` DATETIME NULL,
  `expires_at` DATETIME NULL,
  `fulfilled_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_res_user` (`user_id`),
  INDEX `idx_res_book` (`book_id`),
  INDEX `idx_res_status` (`status`),
  CONSTRAINT `fk_res_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_copy` FOREIGN KEY (`assigned_copy_id`) REFERENCES `book_copies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12. Renewals
CREATE TABLE IF NOT EXISTS `renewals` (
  `id` VARCHAR(36) NOT NULL,
  `loan_id` VARCHAR(36) NOT NULL,
  `requested_by` VARCHAR(36) NOT NULL,
  `reviewed_by` VARCHAR(36) NULL,
  `old_due_at` DATETIME NOT NULL,
  `new_due_at` DATETIME NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `reason` TEXT NULL,
  `rejection_reason` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_ren_loan` (`loan_id`),
  INDEX `idx_ren_req` (`requested_by`),
  INDEX `idx_ren_status` (`status`),
  CONSTRAINT `fk_ren_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ren_user` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ren_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 13. Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `type` VARCHAR(25) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `channel` VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
  `delivery_status` VARCHAR(20) NOT NULL DEFAULT 'DELIVERED',
  `read_at` DATETIME NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notif_user` (`user_id`),
  INDEX `idx_notif_read` (`read_at`),
  INDEX `idx_notif_type` (`type`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. Notification Preferences
CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL UNIQUE,
  `email_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `push_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `reminder_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_np_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 15. Push Devices
CREATE TABLE IF NOT EXISTS `push_devices` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `device_token` VARCHAR(255) NOT NULL,
  `platform` VARCHAR(20) NOT NULL DEFAULT 'WEB',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_pd_user` (`user_id`),
  CONSTRAINT `fk_pd_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. Library Settings
CREATE TABLE IF NOT EXISTS `library_settings` (
  `id` VARCHAR(36) NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_by` VARCHAR(36) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ls_key` (`setting_key`),
  CONSTRAINT `fk_ls_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 17. Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `actor_id` VARCHAR(36) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(36) NULL,
  `old_values` TEXT NULL,
  `new_values` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_al_actor` (`actor_id`),
  INDEX `idx_al_action` (`action`),
  INDEX `idx_al_entity` (`entity_type`),
  INDEX `idx_al_created` (`created_at`),
  CONSTRAINT `fk_al_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
