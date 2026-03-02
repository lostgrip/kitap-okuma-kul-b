-- Migration: Add publisher column to books table
ALTER TABLE books ADD COLUMN publisher text;
