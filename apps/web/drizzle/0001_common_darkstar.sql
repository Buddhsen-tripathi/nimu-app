CREATE TABLE "billing_record" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"period" "billing_period" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_generations" integer DEFAULT 0 NOT NULL,
	"total_api_calls" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"total_storage_bytes" integer DEFAULT 0 NOT NULL,
	"total_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"video_generation_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"audio_generation_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"storage_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"payment_method" text,
	"payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"type" "conversation_type" DEFAULT 'general_chat' NOT NULL,
	"status" "conversation_status" DEFAULT 'active' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "generation_type" NOT NULL,
	"provider" "provider" NOT NULL,
	"model" text NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"prompt" text NOT NULL,
	"parameters" jsonb,
	"result_url" text,
	"result_file_path" text,
	"thumbnail_url" text,
	"duration" integer,
	"file_size" integer,
	"resolution" text,
	"format" text,
	"processing_time" integer,
	"queue_position" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"cost" numeric(10, 4),
	"tokens_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_job" (
	"id" text PRIMARY KEY NOT NULL,
	"generation_id" text NOT NULL,
	"job_id" text NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"next_retry_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" "message_role" NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp,
	"parent_message_id" text,
	"token_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_quota" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"max_generations_per_day" integer DEFAULT 10 NOT NULL,
	"max_generations_per_month" integer DEFAULT 100 NOT NULL,
	"max_storage_bytes" integer DEFAULT 1073741824 NOT NULL,
	"max_files" integer DEFAULT 100 NOT NULL,
	"max_daily_cost" numeric(10, 4) DEFAULT '10.00' NOT NULL,
	"max_monthly_cost" numeric(10, 4) DEFAULT '100.00' NOT NULL,
	"current_daily_generations" integer DEFAULT 0 NOT NULL,
	"current_monthly_generations" integer DEFAULT 0 NOT NULL,
	"current_storage_bytes" integer DEFAULT 0 NOT NULL,
	"current_daily_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"current_monthly_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"last_daily_reset" date NOT NULL,
	"last_monthly_reset" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "usage_type" NOT NULL,
	"date" date NOT NULL,
	"generations_count" integer DEFAULT 0 NOT NULL,
	"api_calls_count" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"storage_used" integer DEFAULT 0 NOT NULL,
	"files_count" integer DEFAULT 0 NOT NULL,
	"total_cost" numeric(10, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE cascade ON UPDATE no action;