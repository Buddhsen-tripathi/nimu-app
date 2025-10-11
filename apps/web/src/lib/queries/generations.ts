import { eq, desc, and, asc } from "drizzle-orm";
import { db } from "../../index";
import {
  generation,
  generationJob,
  conversation,
  message,
} from "../../db/schema";
import type {
  Generation,
  NewGeneration,
  GenerationJob,
  NewGenerationJob,
} from "../../db/schema";

export async function createGeneration(data: NewGeneration, userId: string) {
  // Verify user owns the conversation and message
  const conv = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(
      and(
        eq(conversation.id, data.conversationId),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  if (!conv.length) {
    throw new Error("Conversation not found or access denied");
  }

  const msg = await db
    .select({ id: message.id })
    .from(message)
    .where(
      and(
        eq(message.id, data.messageId),
        eq(message.conversationId, data.conversationId)
      )
    )
    .limit(1);

  if (!msg.length) {
    throw new Error("Message not found or doesn't belong to conversation");
  }

  const result = await db
    .insert(generation)
    .values({
      ...data,
      userId,
      status: "pending_clarification", // Start with clarification status
    })
    .returning();

  return result[0];
}

export async function getGenerations(conversationId: string, userId: string) {
  // Verify user owns the conversation
  const conv = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(
      and(
        eq(conversation.id, conversationId),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  if (!conv.length) {
    throw new Error("Conversation not found or access denied");
  }

  return await db
    .select()
    .from(generation)
    .where(eq(generation.conversationId, conversationId))
    .orderBy(desc(generation.createdAt));
}

export async function getGenerationById(id: string, userId: string) {
  const result = await db
    .select()
    .from(generation)
    .innerJoin(conversation, eq(generation.conversationId, conversation.id))
    .where(
      and(
        eq(generation.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  return result[0]?.generation || null;
}

export async function updateGenerationStatus(
  id: string,
  status: Generation["status"],
  userId: string,
  additionalData?: Partial<Generation>
) {
  // Verify user owns the generation through conversation ownership
  const genWithConv = await db
    .select({ generationId: generation.id })
    .from(generation)
    .innerJoin(conversation, eq(generation.conversationId, conversation.id))
    .where(
      and(
        eq(generation.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  if (!genWithConv.length) {
    throw new Error("Generation not found or access denied");
  }

  const updateData: Partial<Generation> = {
    status,
    updatedAt: new Date(),
    ...additionalData,
  };

  // Set appropriate timestamps based on status
  if (status === "processing") {
    updateData.startedAt = new Date();
  } else if (status === "completed") {
    updateData.completedAt = new Date();
  } else if (status === "failed") {
    updateData.failedAt = new Date();
  }

  const result = await db
    .update(generation)
    .set(updateData)
    .where(eq(generation.id, id))
    .returning();

  return result[0] || null;
}

export async function updateGenerationClarification(
  id: string,
  clarificationQuestions: any,
  clarificationResponses: any,
  userId: string
) {
  // Verify user owns the generation
  const genWithConv = await db
    .select({ generationId: generation.id })
    .from(generation)
    .innerJoin(conversation, eq(generation.conversationId, conversation.id))
    .where(
      and(
        eq(generation.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  if (!genWithConv.length) {
    throw new Error("Generation not found or access denied");
  }

  const updateData: Partial<Generation> = {
    clarificationQuestions,
    clarificationResponses,
    status: "pending_confirmation", // Move to confirmation stage
    updatedAt: new Date(),
  };

  const result = await db
    .update(generation)
    .set(updateData)
    .where(eq(generation.id, id))
    .returning();

  return result[0] || null;
}

export async function confirmGeneration(
  id: string,
  userId: string,
  bullmqJobId?: string
) {
  // Verify user owns the generation
  const genWithConv = await db
    .select({ generationId: generation.id })
    .from(generation)
    .innerJoin(conversation, eq(generation.conversationId, conversation.id))
    .where(
      and(
        eq(generation.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  if (!genWithConv.length) {
    throw new Error("Generation not found or access denied");
  }

  const updateData: Partial<Generation> = {
    status: "queued",
    bullmqJobId,
    updatedAt: new Date(),
  };

  const result = await db
    .update(generation)
    .set(updateData)
    .where(eq(generation.id, id))
    .returning();

  return result[0] || null;
}

export async function getActiveGenerations(userId: string) {
  return await db
    .select()
    .from(generation)
    .innerJoin(conversation, eq(generation.conversationId, conversation.id))
    .where(
      and(
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false),
        eq(generation.status, "processing")
      )
    )
    .orderBy(asc(generation.createdAt));
}

export async function getPendingClarifications(userId: string) {
  return await db
    .select()
    .from(generation)
    .innerJoin(conversation, eq(generation.conversationId, conversation.id))
    .where(
      and(
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false),
        eq(generation.status, "pending_clarification")
      )
    )
    .orderBy(asc(generation.createdAt));
}

export async function getQueuedGenerations(userId: string) {
  return await db
    .select()
    .from(generation)
    .innerJoin(conversation, eq(generation.conversationId, conversation.id))
    .where(
      and(
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false),
        eq(generation.status, "queued")
      )
    )
    .orderBy(asc(generation.createdAt));
}

export async function createGenerationJob(data: NewGenerationJob) {
  const result = await db.insert(generationJob).values(data).returning();

  return result[0];
}

export async function updateGenerationJob(
  id: string,
  status: GenerationJob["status"],
  additionalData?: Partial<GenerationJob>
) {
  const updateData: Partial<GenerationJob> = {
    status,
    updatedAt: new Date(),
    ...additionalData,
  };

  const result = await db
    .update(generationJob)
    .set(updateData)
    .where(eq(generationJob.id, id))
    .returning();

  return result[0] || null;
}

export async function getGenerationJobById(id: string) {
  const result = await db
    .select()
    .from(generationJob)
    .where(eq(generationJob.id, id))
    .limit(1);

  return result[0] || null;
}

export async function getGenerationJobByJobId(jobId: string) {
  const result = await db
    .select()
    .from(generationJob)
    .where(eq(generationJob.jobId, jobId))
    .limit(1);

  return result[0] || null;
}
