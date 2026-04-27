import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "./lib/logger";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: true, credentials: true },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "socket connected");

    socket.on("join_room", async (roomId: string) => {
      if (typeof roomId !== "string" || !roomId) return;
      socket.join(roomId);

      try {
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
          .orderBy(desc(messagesTable.createdAt))
          .limit(50);

        const messages = rows.reverse().map((m) => ({
          id: m.id,
          roomId: m.roomId,
          userId: m.userId,
          userDisplayName: m.userDisplayName,
          userAvatarColor: m.userAvatarColor,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        }));

        socket.emit("load_messages", { roomId, messages });
      } catch (err) {
        logger.error({ err, roomId }, "failed to load messages on join");
      }
    });

    socket.on("leave_room", (roomId: string) => {
      if (typeof roomId === "string" && roomId) socket.leave(roomId);
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "socket disconnected");
    });
  });

  return io;
}

export function emitNewMessage(roomId: string, message: unknown) {
  if (!io) return;
  io.to(roomId).emit("new_message", message);
}
