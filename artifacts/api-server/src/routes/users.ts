import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBodySchema } from "@workspace/api-zod";
import { pickAvatarColor } from "../lib/avatar";

const router: IRouter = Router();

router.post("/users", async (req, res) => {
  const parsed = CreateUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const displayName = parsed.data.displayName.trim();
  if (!displayName) {
    return res.status(400).json({ error: "Display name required" });
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.displayName, displayName))
    .limit(1);

  if (existing.length > 0) {
    const u = existing[0]!;
    return res.json({
      id: u.id,
      displayName: u.displayName,
      avatarColor: u.avatarColor,
      createdAt: u.createdAt.toISOString(),
    });
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      displayName,
      avatarColor: pickAvatarColor(displayName),
    })
    .returning();

  return res.json({
    id: created!.id,
    displayName: created!.displayName,
    avatarColor: created!.avatarColor,
    createdAt: created!.createdAt.toISOString(),
  });
});

router.get("/users/:userId", async (req, res) => {
  const userId = req.params.userId;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (rows.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  const u = rows[0]!;
  return res.json({
    id: u.id,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt.toISOString(),
  });
});

export default router;
