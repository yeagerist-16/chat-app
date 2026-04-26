import { db, roomsTable, usersTable, messagesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const ROOMS = [
  {
    name: "general",
    description: "Anything goes — say hi and meet the crew.",
    emoji: "💬",
  },
  {
    name: "random",
    description: "Memes, jokes, and off-topic chatter.",
    emoji: "🎲",
  },
  {
    name: "design",
    description: "Share work-in-progress, get feedback, talk craft.",
    emoji: "🎨",
  },
];

const SEED_USERS = [
  { displayName: "Ada", avatarColor: "#3b82f6" },
  { displayName: "Linus", avatarColor: "#ef4444" },
  { displayName: "Grace", avatarColor: "#10b981" },
  { displayName: "Margaret", avatarColor: "#a855f7" },
];

const MESSAGES: Record<string, { user: string; body: string }[]> = {
  general: [
    { user: "Ada", body: "Welcome everyone! Glad you're here 👋" },
    { user: "Linus", body: "Just shipped a small refactor. Feels good." },
    { user: "Grace", body: "Anyone up for a coffee chat later?" },
    { user: "Margaret", body: "I'll be around after lunch." },
  ],
  random: [
    { user: "Linus", body: "Saw a cat wearing tiny boots today. That's it. That's the message." },
    { user: "Grace", body: "Boots make everything better." },
    { user: "Ada", body: "Counterpoint: socks." },
  ],
  design: [
    { user: "Margaret", body: "Working on a new color system — opinions on warmer neutrals?" },
    { user: "Ada", body: "Warmer reads friendlier IMO. Worth A/B testing the empty states." },
    { user: "Grace", body: "Agreed. Pair it with a softer shadow scale." },
  ],
};

async function main() {
  const [{ existing }] = await db
    .select({ existing: sql<number>`count(*)::int` })
    .from(roomsTable);
  if ((existing ?? 0) > 0) {
    console.log("Rooms already seeded, skipping.");
    process.exit(0);
  }

  const insertedUsers = await db
    .insert(usersTable)
    .values(SEED_USERS)
    .returning();
  const userByName = new Map(insertedUsers.map((u) => [u.displayName, u]));

  const insertedRooms = await db.insert(roomsTable).values(ROOMS).returning();
  const roomByName = new Map(insertedRooms.map((r) => [r.name, r]));

  let now = Date.now() - 1000 * 60 * 60;
  for (const [roomName, msgs] of Object.entries(MESSAGES)) {
    const room = roomByName.get(roomName)!;
    for (const m of msgs) {
      const user = userByName.get(m.user)!;
      await db.insert(messagesTable).values({
        roomId: room.id,
        userId: user.id,
        body: m.body,
        createdAt: new Date(now),
      });
      now += 1000 * 60 * 5;
    }
  }

  console.log(
    `Seeded ${insertedRooms.length} rooms, ${insertedUsers.length} users, ${Object.values(MESSAGES).flat().length} messages.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
