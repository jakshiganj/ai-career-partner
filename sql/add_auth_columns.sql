-- Migration: Add auth_provider and password reset columns to users table
-- Run this against the career_db database

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP DEFAULT NULL;
