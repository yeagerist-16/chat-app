import { Router, type IRouter } from "express";
import { db, roomsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { CreateRoomBodySchema } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/rooms", async (_req, res) => {
  const rows = await db
    .select({
      id: roomsTable.id,
      name: roomsTable.name,
      description: roomsTable.description,
      emoji: roomsTable.emoji,
      createdAt: roomsTable.createdAt,
      messageCount: sql<number>`count(${messagesTable.id})::int`,
      lastMessageAt: sql<Date | null>`max(${messagesTable.createdAt})`,
    })
    .from(roomsTable)
    .leftJoin(messagesTable, eq(messagesTable.roomId, roomsTable.id))
    .groupBy(roomsTable.id)
    .orderBy(desc(roomsTable.createdAt));

  const withPreview = await Promise.all(
    rows.map(async (r) => {
      let lastMessagePreview: string | null = null;
      if (r.lastMessageAt) {
        const last = await db
          .select({ body: messagesTable.body })
          .from(messagesTable)
          .where(eq(messagesTable.roomId, r.id))
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);
        if (last[0]) {
          lastMessagePreview = last[0].body.slice(0, 120);
        }
      }
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
        messageCount: r.messageCount,
        lastMessageAt: r.lastMessageAt
          ? new Date(r.lastMessageAt).toISOString()
          : null,
        lastMessagePreview,
      };
    }),
  );

  return res.json(withPreview);
});

router.post("/rooms", async (req, res) => {
  const parsed = CreateRoomBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const { name, description, emoji } = parsed.data;
  const [created] = await db
    .insert(roomsTable)
    .values({
      name: name.trim(),
      description: (description ?? "").trim(),
      emoji: (emoji ?? "💬").trim() || "💬",
    })
    .returning();
  return res.status(201).json({
    id: created!.id,
    name: created!.name,
    description: created!.description,
    emoji: created!.emoji,
    createdAt: created!.createdAt.toISOString(),
    messageCount: 0,
    lastMessageAt: null,
    lastMessagePreview: null,
  });
});

router.get("/rooms/:roomId", async (req, res) => {
  const roomId = req.params.roomId;
  const rows = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, roomId))
    .limit(1);
  if (rows.length === 0) {
    return res.status(404).json({ error: "Room not found" });
  }
  const r = rows[0]!;

  const [{ count: messageCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(eq(messagesTable.roomId, roomId));

  const [{ count: memberCount }] = await db
    .select({
      count: sql<number>`count(distinct ${messagesTable.userId})::int`,
    })
    .from(messagesTable)
    .where(eq(messagesTable.roomId, roomId));

  return res.json({
    id: r.id,
    name: r.name,
    description: r.description,
    emoji: r.emoji,
    createdAt: r.createdAt.toISOString(),
    messageCount: messageCount ?? 0,
    memberCount: memberCount ?? 0,
  });
});

router.get("/rooms/:roomId/members", async (req, res) => {
  const roomId = req.params.roomId;
  const sinceMs = Date.now() - 1000 * 60 * 60 * 24 * 30;
  const rows = await db
    .selectDistinct({
      id: usersTable.id,
      displayName: usersTable.displayName,
      avatarColor: usersTable.avatarColor,
      createdAt: usersTable.createdAt,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.userId))
    .where(
      and(
        eq(messagesTable.roomId, roomId),
        gte(messagesTable.createdAt, new Date(sinceMs)),
      ),
    );
  return res.json(
    rows.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      avatarColor: u.avatarColor,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

export default router;
