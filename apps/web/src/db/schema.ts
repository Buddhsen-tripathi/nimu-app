// @ts-nocheck - Suppress Drizzle ORM type compatibility issues with relations
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ========== ENUMS ==========

// Auth enums (no specific enums in auth-schema)

// Conversation enums
export const conversationTypeEnum = pgEnum("conversation_type", [
  "video_generation",
  "audio_generation",
  "general_chat",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "active",
  "archived",
  "deleted",
]);

// Message enums
export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "prompt",
  "response",
  "error",
  "generation_request",
  "generation_result",
]);

// Generation enums
export const generationTypeEnum = pgEnum("generation_type", ["video", "audio"]);

export const generationStatusEnum = pgEnum("generation_status", [
  "pending_clarification",
  "pending_confirmation",
  "confirmed",
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const providerEnum = pgEnum("provider", [
  "google",
  "veo3", // Keep for backward compatibility
  "runway",
  "pika",
  "stable_video",
  "elevenlabs",
  "murf",
  "synthesia",
]);

// Usage enums
export const usageTypeEnum = pgEnum("usage_type", [
  "video_generation",
  "audio_generation",
  "api_call",
  "storage",
]);

export const billingPeriodEnum = pgEnum("billing_period", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

// ========== TABLES ==========

// Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Conversation table
export const conversation = pgTable("conversation", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // References user.id
  title: text("title"),
  type: conversationTypeEnum("type").default("general_chat").notNull(),
  status: conversationStatusEnum("status").default("active").notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Message table
export const message = pgTable("message", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: messageRoleEnum("role").notNull(),
  type: messageTypeEnum("type").default("text").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Store additional data like tokens, processing time, etc.
  isEdited: boolean("is_edited").default(false).notNull(),
  editedAt: timestamp("edited_at"),
  parentMessageId: text("parent_message_id"), // For threading/replies
  tokenCount: integer("token_count"), // For tracking API usage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Generation tables
export const generation = pgTable("generation", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  messageId: text("message_id").notNull(),
  userId: text("user_id").notNull(), // References user.id
  type: generationTypeEnum("type").notNull(),
  provider: providerEnum("provider").notNull(),
  model: text("model").notNull(), // Specific model version (e.g., "veo3-v1.0")
  status: generationStatusEnum("status").default("pending").notNull(),

  // Input/Output data
  prompt: text("prompt").notNull(),
  parameters: jsonb("parameters"), // Generation parameters (duration, style, etc.)
  clarificationQuestions: jsonb("clarification_questions"), // AI-generated clarification questions
  clarificationResponses: jsonb("clarification_responses"), // User responses to clarification
  resultUrl: text("result_url"), // URL to generated file
  resultFilePath: text("result_file_path"), // Local file path
  thumbnailUrl: text("thumbnail_url"), // For video thumbnails

  // Metadata
  duration: integer("duration"), // Duration in seconds
  fileSize: integer("file_size"), // File size in bytes
  resolution: text("resolution"), // e.g., "1920x1080"
  format: text("format"), // e.g., "mp4", "wav"

  // Processing info
  processingTime: integer("processing_time"), // Processing time in seconds
  queuePosition: integer("queue_position"), // Position in processing queue
  workerJobId: text("worker_job_id"), // Cloudflare Worker job ID for tracking
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),

  // Cost tracking
  cost: decimal("cost", { precision: 10, scale: 4 }), // Cost in USD
  tokensUsed: integer("tokens_used"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Generation jobs table for tracking async processing
export const generationJob = pgTable("generation_job", {
  id: text("id").primaryKey(),
  generationId: text("generation_id")
    .notNull()
    .references(() => generation.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull(), // External job ID from AI provider
  status: generationStatusEnum("status").default("pending").notNull(),
  progress: integer("progress").default(0), // Progress percentage 0-100
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  nextRetryAt: timestamp("next_retry_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Usage tables
export const userUsage = pgTable("user_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // References user.id
  type: usageTypeEnum("type").notNull(),
  date: date("date").notNull(), // For daily usage tracking

  // Counters
  generationsCount: integer("generations_count").default(0).notNull(),
  apiCallsCount: integer("api_calls_count").default(0).notNull(),
  tokensUsed: integer("tokens_used").default(0).notNull(),

  // Storage usage (in bytes)
  storageUsed: integer("storage_used").default(0).notNull(),
  filesCount: integer("files_count").default(0).notNull(),

  // Cost tracking
  totalCost: decimal("total_cost", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const userQuota = pgTable("user_quota", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // References user.id

  // Generation limits
  maxGenerationsPerDay: integer("max_generations_per_day")
    .default(10)
    .notNull(),
  maxGenerationsPerMonth: integer("max_generations_per_month")
    .default(100)
    .notNull(),

  // Storage limits
  maxStorageBytes: integer("max_storage_bytes").default(1073741824).notNull(), // 1GB default
  maxFiles: integer("max_files").default(100).notNull(),

  // Cost limits
  maxDailyCost: decimal("max_daily_cost", { precision: 10, scale: 4 })
    .default("10.00")
    .notNull(),
  maxMonthlyCost: decimal("max_monthly_cost", { precision: 10, scale: 4 })
    .default("100.00")
    .notNull(),

  // Current usage (cached for performance)
  currentDailyGenerations: integer("current_daily_generations")
    .default(0)
    .notNull(),
  currentMonthlyGenerations: integer("current_monthly_generations")
    .default(0)
    .notNull(),
  currentStorageBytes: integer("current_storage_bytes").default(0).notNull(),
  currentDailyCost: decimal("current_daily_cost", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),
  currentMonthlyCost: decimal("current_monthly_cost", {
    precision: 10,
    scale: 4,
  })
    .default("0")
    .notNull(),

  // Reset dates
  lastDailyReset: date("last_daily_reset").notNull(),
  lastMonthlyReset: date("last_monthly_reset").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const billingRecord = pgTable("billing_record", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // References user.id
  period: billingPeriodEnum("period").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),

  // Usage summary
  totalGenerations: integer("total_generations").default(0).notNull(),
  totalApiCalls: integer("total_api_calls").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),
  totalStorageBytes: integer("total_storage_bytes").default(0).notNull(),

  // Cost breakdown
  totalCost: decimal("total_cost", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),
  videoGenerationCost: decimal("video_generation_cost", {
    precision: 10,
    scale: 4,
  })
    .default("0")
    .notNull(),
  audioGenerationCost: decimal("audio_generation_cost", {
    precision: 10,
    scale: 4,
  })
    .default("0")
    .notNull(),
  storageCost: decimal("storage_cost", { precision: 10, scale: 4 })
    .default("0")
    .notNull(),

  // Payment info
  isPaid: boolean("is_paid").default(false).notNull(),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  paymentId: text("payment_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ========== RELATIONSHIPS ==========

// Auth relationships
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  conversations: many(conversation),
  generations: many(generation),
  usage: many(userUsage),
  quota: many(userQuota),
  billingRecords: many(billingRecord),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Conversation relationships
export const conversationRelations = relations(
  conversation,
  ({ one, many }) => ({
    user: one(user, {
      fields: [conversation.userId],
      references: [user.id],
    }),
    messages: many(message),
    generations: many(generation),
  })
);

// Message relationships
export const messageRelations = relations(message, ({ one, many }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  parentMessage: one(message, {
    fields: [message.parentMessageId],
    references: [message.id],
  }),
  childMessages: many(message),
  generations: many(generation),
}));

// Generation relationships
export const generationRelations = relations(generation, ({ one, many }) => ({
  conversation: one(conversation, {
    fields: [generation.conversationId],
    references: [conversation.id],
  }),
  message: one(message, {
    fields: [generation.messageId],
    references: [message.id],
  }),
  user: one(user, {
    fields: [generation.userId],
    references: [user.id],
  }),
  jobs: many(generationJob),
}));

export const generationJobRelations = relations(generationJob, ({ one }) => ({
  generation: one(generation, {
    fields: [generationJob.generationId],
    references: [generation.id],
  }),
}));

// Usage relationships
export const userUsageRelations = relations(userUsage, ({ one }) => ({
  user: one(user, {
    fields: [userUsage.userId],
    references: [user.id],
  }),
}));

export const userQuotaRelations = relations(userQuota, ({ one }) => ({
  user: one(user, {
    fields: [userQuota.userId],
    references: [user.id],
  }),
}));

export const billingRecordRelations = relations(billingRecord, ({ one }) => ({
  user: one(user, {
    fields: [billingRecord.userId],
    references: [user.id],
  }),
}));

// ========== TYPE EXPORTS ==========

// Conversation types
export type Conversation = typeof conversation.$inferSelect;
export type NewConversation = typeof conversation.$inferInsert;

// Message types
export type Message = typeof message.$inferSelect;
export type NewMessage = typeof message.$inferInsert;

// Generation types
export type Generation = typeof generation.$inferSelect;
export type NewGeneration = typeof generation.$inferInsert;
export type GenerationJob = typeof generationJob.$inferSelect;
export type NewGenerationJob = typeof generationJob.$inferInsert;

// Usage types
export type UserUsage = typeof userUsage.$inferSelect;
export type NewUserUsage = typeof userUsage.$inferInsert;
export type UserQuota = typeof userQuota.$inferSelect;
export type NewUserQuota = typeof userQuota.$inferInsert;
export type BillingRecord = typeof billingRecord.$inferSelect;
export type NewBillingRecord = typeof billingRecord.$inferInsert;
