-- ai-core tables. Installed by createDatabaseTables on start: missing tables and columns are added, nothing is
-- dropped, keys are only created with a new table.

CREATE TABLE IF NOT EXISTS `ai_core_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `fivem` VARCHAR(20) NOT NULL,
  `license` VARCHAR(60) DEFAULT NULL,
  `discord` VARCHAR(30) DEFAULT NULL,
  `name` VARCHAR(64) NOT NULL DEFAULT '',
  `char_slots` TINYINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT current_timestamp(),
  `last_seen` DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `fivem` (`fivem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_core_characters` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `citizenid` VARCHAR(16) NOT NULL,
  `slot` TINYINT UNSIGNED NOT NULL,
  `firstname` VARCHAR(32) NOT NULL,
  `lastname` VARCHAR(32) NOT NULL,
  `birthdate` DATE NOT NULL,
  `sex` VARCHAR(8) NOT NULL,
  `pos_x` FLOAT DEFAULT NULL,
  `pos_y` FLOAT DEFAULT NULL,
  `pos_z` FLOAT DEFAULT NULL,
  `pos_h` FLOAT DEFAULT NULL,
  `metadata` LONGTEXT NOT NULL DEFAULT '{}',
  `created_at` DATETIME NOT NULL DEFAULT current_timestamp(),
  `last_played` DATETIME DEFAULT NULL,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `citizenid` (`citizenid`),
  KEY `user_id` (`user_id`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_core_accounts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_type` VARCHAR(16) NOT NULL,
  `owner_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(32) NOT NULL,
  `balance` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `owner_account` (`owner_type`, `owner_id`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_core_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` INT UNSIGNED NOT NULL,
  `amount` BIGINT NOT NULL,
  `balance_after` BIGINT NOT NULL,
  `reason` VARCHAR(64) NOT NULL,
  `actor` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `account_time` (`account_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_core_character_jobs` (
  `char_id` INT UNSIGNED NOT NULL,
  `job` VARCHAR(32) NOT NULL,
  `grade` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`char_id`, `job`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_core_character_gangs` (
  `char_id` INT UNSIGNED NOT NULL,
  `gang` VARCHAR(32) NOT NULL,
  `grade` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `active` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`char_id`, `gang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
