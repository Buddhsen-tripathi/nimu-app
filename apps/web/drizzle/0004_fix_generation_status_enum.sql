-- Migration: Fix generation status enum values
-- This migration updates existing "pending" status to "pending_clarification"

-- Update any existing "pending" status to "pending_clarification"
UPDATE generation 
SET status = 'pending_clarification' 
WHERE status = 'pending';

-- Update any existing "pending" status in generation_job table
UPDATE generation_job 
SET status = 'pending_clarification' 
WHERE status = 'pending';
