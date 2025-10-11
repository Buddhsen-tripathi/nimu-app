import { eq, desc, and, asc } from "drizzle-orm";
import { db } from "../../index";
import { message, conversation } from "../../db/schema";
import type { Message, NewMessage } from "../../db/schema";

export async function getMessages(conversationId: string, userId: string) {
  // First verify the user owns the conversation
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
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(asc(message.createdAt));
}

export async function getMessageById(id: string, userId: string) {
  const result = await db
    .select()
    .from(message)
    .innerJoin(conversation, eq(message.conversationId, conversation.id))
    .where(
      and(
        eq(message.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  return result[0]?.message || null;
}

export async function createMessage(data: NewMessage, userId: string) {
  // Verify user owns the conversation
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

  const result = await db.insert(message).values(data).returning();

  // Update conversation's last message time and message count
  const messageCountResult = await db
    .select({ count: message.id })
    .from(message)
    .where(eq(message.conversationId, data.conversationId));

  await db
    .update(conversation)
    .set({
      lastMessageAt: new Date(),
      messageCount: messageCountResult.length,
      updatedAt: new Date(),
    })
    .where(eq(conversation.id, data.conversationId));

  return result[0];
}

export async function updateMessage(
  id: string,
  content: string,
  userId: string
) {
  // Verify user owns the message through conversation ownership
  const messageWithConv = await db
    .select({ messageId: message.id })
    .from(message)
    .innerJoin(conversation, eq(message.conversationId, conversation.id))
    .where(
      and(
        eq(message.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  if (!messageWithConv.length) {
    throw new Error("Message not found or access denied");
  }

  const result = await db
    .update(message)
    .set({
      content,
      isEdited: true,
      editedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(message.id, id))
    .returning();

  return result[0] || null;
}

export async function deleteMessage(id: string, userId: string) {
  // Verify user owns the message through conversation ownership
  const messageWithConv = await db
    .select({ messageId: message.id })
    .from(message)
    .innerJoin(conversation, eq(message.conversationId, conversation.id))
    .where(
      and(
        eq(message.id, id),
        eq(conversation.userId, userId),
        eq(conversation.isDeleted, false)
      )
    )
    .limit(1);

  if (!messageWithConv.length) {
    throw new Error("Message not found or access denied");
  }

  const result = await db.delete(message).where(eq(message.id, id)).returning();

  // Update conversation message count
  if (result.length > 0) {
    const conversationId = result[0]?.conversationId;
    if (conversationId) {
      const messageCount = await db
        .select({ count: message.id })
        .from(message)
        .where(eq(message.conversationId, conversationId));

      await db
        .update(conversation)
        .set({
          messageCount: messageCount.length,
          updatedAt: new Date(),
        })
        .where(eq(conversation.id, conversationId));
    }
  }

  return result[0] || null;
}

export async function getRecentMessages(
  conversationId: string,
  limit: number = 50
) {
  return await db
    .select()
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(desc(message.createdAt))
    .limit(limit);
}

export async function searchMessages(
  conversationId: string,
  query: string,
  userId: string
) {
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
    .from(message)
    .where(
      and(
        eq(message.conversationId, conversationId),
        // Note: You might want to use full-text search or ilike for better search
        eq(message.content, query) // This is a simple exact match - improve as needed
      )
    )
    .orderBy(desc(message.createdAt));
}
