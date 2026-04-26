import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, roomsTable } from "@workspace/db";
import { eq, sql, desc, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ totalRooms }] = await db
    .select({ totalRooms: sql<number>`count(*)::int` })
    .from(roomsTable);
  const [{ totalMessages }] = await db
    .select({ totalMessages: sql<number>`count(*)::int` })
    .from(messagesTable);
  const [{ totalUsers }] = await db
    .select({ totalUsers: sql<number>`count(*)::int` })
    .from(usersTable);
  const [{ messagesToday }] = await db
    .select({ messagesToday: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(gte(messagesTable.createdAt, startOfDay));
  const [{ activeRoomsToday }] = await db
    .select({
      activeRoomsToday: sql<number>`count(distinct ${messagesTable.roomId})::int`,
    })
    .from(messagesTable)
    .where(gte(messagesTable.createdAt, startOfDay));

  return res.json({
    totalRooms: totalRooms ?? 0,
    totalMessages: totalMessages ?? 0,
    totalUsers: totalUsers ?? 0,
    messagesToday: messagesToday ?? 0,
    activeRoomsToday: activeRoomsToday ?? 0,
  });
});

router.get("/dashboard/recent-activity", async (_req, res) => {
  const rows = await db
    .select({
      messageId: messagesTable.id,
      roomId: messagesTable.roomId,
      roomName: roomsTable.name,
      roomEmoji: roomsTable.emoji,
      userDisplayName: usersTable.displayName,
      userAvatarColor: usersTable.avatarColor,
      body: messagesTable.body,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .innerJoin(roomsTable, eq(roomsTable.id, messagesTable.roomId))
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.userId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(20);

  return res.json(
    rows.map((r) => ({
      messageId: r.messageId,
      roomId: r.roomId,
      roomName: r.roomName,
      roomEmoji: r.roomEmoji,
      userDisplayName: r.userDisplayName,
      userAvatarColor: r.userAvatarColor,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

export default router;
