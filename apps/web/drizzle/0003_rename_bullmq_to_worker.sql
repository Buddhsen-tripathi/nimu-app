-- Migration: Rename bullmq_job_id to worker_job_id
-- This migration renames the BullMQ job ID column to Worker job ID

-- Rename the column
ALTER TABLE generation 
RENAME COLUMN bullmq_job_id TO worker_job_id;

-- Update the comment
COMMENT ON COLUMN generation.worker_job_id IS 'Cloudflare Worker job ID for tracking';
