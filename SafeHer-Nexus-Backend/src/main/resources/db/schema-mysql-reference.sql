-- =============================================================================
-- SafeHer Nexus - Non-Destructive MySQL 8 Schema Reference (Phases 2, 3 & 4)
-- Run ONLY after confirming and selecting your dedicated new database
-- (e.g., CREATE DATABASE IF NOT EXISTS safeher_nexus_db; USE safeher_nexus_db;)
-- Never drops, resets, or destructively alters any existing tables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(25) NULL,
    safety_note VARCHAR(250) NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(25) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    email VARCHAR(180) NULL,
    primary_contact BIT(1) NOT NULL DEFAULT b'0',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_emergency_contacts_user_id (user_id),
    CONSTRAINT fk_emergency_contacts_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emergency_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    notification_status VARCHAR(30) NOT NULL DEFAULT 'NOT_CONFIGURED',
    location_attached BIT(1) NOT NULL DEFAULT b'0',
    initial_latitude DOUBLE NULL,
    initial_longitude DOUBLE NULL,
    location_accuracy_meters DOUBLE NULL,
    location_captured_at TIMESTAMP(6) NULL,
    location_label VARCHAR(160) NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    resolved_at TIMESTAMP(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_emergency_events_user_created (user_id, created_at),
    INDEX idx_emergency_events_user_status (user_id, status),
    CONSTRAINT fk_emergency_events_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS safety_tips (
    id BIGINT NOT NULL AUTO_INCREMENT,
    category VARCHAR(40) NOT NULL,
    title VARCHAR(120) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    emergency_number VARCHAR(25) NULL,
    helpline BIT(1) NOT NULL DEFAULT b'0',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_safety_tips_category (category),
    INDEX idx_safety_tips_helpline (helpline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emergency_event_locations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    emergency_event_id BIGINT NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    accuracy_meters DOUBLE NULL,
    altitude_meters DOUBLE NULL,
    speed_mps DOUBLE NULL,
    heading_degrees DOUBLE NULL,
    recorded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_event_locations_event_recorded (emergency_event_id, recorded_at),
    CONSTRAINT fk_event_locations_event
        FOREIGN KEY (emergency_event_id) REFERENCES emergency_events (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emergency_notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    emergency_event_id BIGINT NOT NULL,
    emergency_contact_id BIGINT NULL,
    recipient_phone VARCHAR(25) NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    message_body VARCHAR(1000) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'NOT_CONFIGURED',
    provider_message_id VARCHAR(100) NULL,
    error_message VARCHAR(500) NULL,
    sent_at TIMESTAMP(6) NULL,
    delivered_at TIMESTAMP(6) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_notifications_event_id (emergency_event_id),
    INDEX idx_notifications_provider_msg_id (provider_message_id),
    CONSTRAINT fk_notifications_event
        FOREIGN KEY (emergency_event_id) REFERENCES emergency_events (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_contact
        FOREIGN KEY (emergency_contact_id) REFERENCES emergency_contacts (id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
