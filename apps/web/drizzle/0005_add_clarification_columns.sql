-- Migration: Add clarification columns to generation table
-- This migration adds the missing clarification_questions and clarification_responses columns

-- Add clarification_questions column
ALTER TABLE generation 
ADD COLUMN clarification_questions jsonb;

-- Add clarification_responses column  
ALTER TABLE generation 
ADD COLUMN clarification_responses jsonb;

-- Add worker_job_id column if it doesn't exist (from previous migration)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'generation' AND column_name = 'worker_job_id') THEN
        ALTER TABLE generation ADD COLUMN worker_job_id text;
        COMMENT ON COLUMN generation.worker_job_id IS 'Cloudflare Worker job ID for tracking';
    END IF;
END $$;
