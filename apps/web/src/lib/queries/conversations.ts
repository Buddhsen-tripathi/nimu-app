import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db } from "../../index";
import { conversation, message, user } from "../../db/schema";
import type { Conversation, NewConversation } from "../../db/schema";

export async function getConversations(userId: string) {
  return await db
    .select({
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      type: conversation.type,
      status: conversation.status,
      isArchived: conversation.isArchived,
      isDeleted: conversation.isDeleted,
      messageCount: conversation.messageCount,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      // Get the last message content for preview
      lastMessage: message.content,
    })
    .from(conversation)
    .leftJoin(
      message,
      and(
        eq(message.conversationId, conversation.id),
        eq(
          message.id,
          db
            .select({ id: message.id })
            .from(message)
            .where(eq(message.conversationId, conversation.id))
            .orderBy(desc(message.createdAt))
            .limit(1)
        )
      )
    )
    .where(
      and(eq(conversation.userId, userId), eq(conversation.isDeleted, false))
    )
    .orderBy(desc(conversation.updatedAt));
}

export async function getConversationById(id: string, userId: string) {
  const result = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function createConversation(data: NewConversation) {
  const result = await db.insert(conversation).values(data).returning();

  return result[0];
}

export async function updateConversation(
  id: string,
  userId: string,
  data: Partial<Omit<Conversation, "id" | "userId" | "createdAt" | "updatedAt">>
) {
  const result = await db
    .update(conversation)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversation.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .returning();

  return result[0] || null;
}

export async function deleteConversation(id: string, userId: string) {
  // Soft delete - mark as deleted instead of actually deleting
  const result = await db
    .update(conversation)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
    })
    .where(and(eq(conversation.id, id), eq(conversation.userId, userId)))
    .returning();

  return result[0] || null;
}

export async function toggleConversationPin(id: string, userId: string) {
  // Since we don't have a pinned field, we'll use the status field
  // This is a placeholder - you might want to add a pinned field to the schema
  const current = await getConversationById(id, userId);
  if (!current) return null;

  // For now, we'll use archived status as a proxy for pinned
  const newStatus = current.isArchived ? "active" : "archived";

  return await updateConversation(id, userId, {
    status: newStatus as any,
    isArchived: !current.isArchived,
  });
}

export async function searchConversations(userId: string, query: string) {
  return await db
    .select({
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      type: conversation.type,
      status: conversation.status,
      isArchived: conversation.isArchived,
      isDeleted: conversation.isDeleted,
      messageCount: conversation.messageCount,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessage: message.content,
    })
    .from(conversation)
    .leftJoin(
      message,
      and(
        eq(message.conversationId, conversation.id),
        eq(
          message.id,
          db
            .select({ id: message.id })
            .from(message)
            .where(eq(message.conversationId, conversation.id))
            .orderBy(desc(message.createdAt))
            .limit(1)
        )
      )
    )
    .where(
      and(
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false),
        or(
          ilike(conversation.title, `%${query}%`),
          ilike(message.content, `%${query}%`)
        )
      )
    )
    .orderBy(desc(conversation.updatedAt));
}

export async function getConversationStats(userId: string) {
  const result = await db
    .select({
      total: conversation.id,
      active: conversation.id,
      archived: conversation.id,
    })
    .from(conversation)
    .where(
      and(eq(conversation.userId, userId), eq(conversation.isDeleted, false))
    );

  const stats = {
    total: result.length,
    active: result.filter((c) => !c.archived).length,
    archived: result.filter((c) => c.archived).length,
  };

  return stats;
}
