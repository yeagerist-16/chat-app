import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, roomsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { SendMessageBodySchema } from "@workspace/api-zod";
import { emitNewMessage } from "../socket";

const router: IRouter = Router();

router.get("/rooms/:roomId/messages", async (req, res) => {
  const roomId = req.params.roomId;
  const rows = await db
    .select({
      id: messagesTable.id,
      roomId: messagesTable.roomId,
      userId: messagesTable.userId,
      body: messagesTable.body,
      createdAt: messagesTable.createdAt,
      userDisplayName: usersTable.displayName,
      userAvatarColor: usersTable.avatarColor,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.userId))
    .where(eq(messagesTable.roomId, roomId))
    .orderBy(asc(messagesTable.createdAt))
    .limit(500);

  return res.json(
    rows.map((m) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      userDisplayName: m.userDisplayName,
      userAvatarColor: m.userAvatarColor,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

router.post("/rooms/:roomId/messages", async (req, res) => {
  const roomId = req.params.roomId;
  const parsed = SendMessageBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const { userId, body } = parsed.data;

  const room = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, roomId))
    .limit(1);
  if (room.length === 0) {
    return res.status(404).json({ error: "Room not found" });
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (user.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  const [created] = await db
    .insert(messagesTable)
    .values({ roomId, userId, body: body.trim() })
    .returning();

  const u = user[0]!;
  const payload = {
    id: created!.id,
    roomId: created!.roomId,
    userId: created!.userId,
    userDisplayName: u.displayName,
    userAvatarColor: u.avatarColor,
    body: created!.body,
    createdAt: created!.createdAt.toISOString(),
  };

  emitNewMessage(roomId, payload);

  return res.status(201).json(payload);
});

export default router;
