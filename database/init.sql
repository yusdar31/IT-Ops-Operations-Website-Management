-- IT Operations Hub — Full Database Schema
-- Run once on first startup via docker-compose or K8s init job

CREATE DATABASE IF NOT EXISTS it_ops_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE it_ops_hub;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('admin','technician','viewer') NOT NULL DEFAULT 'viewer',
  department    VARCHAR(100),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default admin (password: Admin@123!)
INSERT IGNORE INTO users (name, email, password_hash, role, department)
VALUES (
  'System Administrator',
  'admin@it-ops-hub.local',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpwLwjUqPY6a4.',
  'admin',
  'IT Department'
);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  hostname      VARCHAR(100)  NOT NULL,
  ip_address    VARCHAR(45)   NOT NULL,
  type          VARCHAR(50)   NOT NULL,
  department    VARCHAR(100),
  location      VARCHAR(150),
  status        ENUM('active','inactive','maintenance') NOT NULL DEFAULT 'active',
  serial_number VARCHAR(100),
  purchase_date DATE,
  notes         TEXT,
  created_by    INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type   (type),
  INDEX idx_department (department)
);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number  VARCHAR(20)   NOT NULL UNIQUE,
  title          VARCHAR(200)  NOT NULL,
  description    TEXT          NOT NULL,
  category       ENUM('incident','service_request','problem','change') NOT NULL DEFAULT 'incident',
  priority       ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  status         ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  asset_id       INT           NULL,
  reporter_id    INT           NOT NULL,
  assignee_id    INT           NULL,
  resolved_at    TIMESTAMP     NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id)    REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id)  ON DELETE RESTRICT,
  FOREIGN KEY (assignee_id) REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_status   (status),
  INDEX idx_priority (priority),
  INDEX idx_assignee (assignee_id),
  INDEX idx_reporter (reporter_id)
);

-- ============================================================
-- TICKET COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id  INT  NOT NULL,
  user_id    INT  NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE RESTRICT
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          NOT NULL,
  type         VARCHAR(50)  NOT NULL,
  message      TEXT         NOT NULL,
  reference_id INT          NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, is_read)
);
