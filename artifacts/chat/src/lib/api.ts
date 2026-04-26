const BASE = `${import.meta.env.BASE_URL}api`;

export interface User {
  id: string;
  displayName: string;
  avatarColor: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  emoji: string;
  createdAt: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export interface RoomDetail {
  id: string;
  name: string;
  description: string;
  emoji: string;
  createdAt: string;
  messageCount: number;
  memberCount: number;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  userDisplayName: string;
  userAvatarColor: string;
  body: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalRooms: number;
  totalMessages: number;
  totalUsers: number;
  messagesToday: number;
  activeRoomsToday: number;
}

export interface ActivityItem {
  messageId: string;
  roomId: string;
  roomName: string;
  roomEmoji: string;
  userDisplayName: string;
  userAvatarColor: string;
  body: string;
  createdAt: string;
}

async function request<T>(
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  createUser: (displayName: string) =>
    request<User>("/users", { method: "POST", body: { displayName } }),
  getUser: (userId: string) => request<User>(`/users/${userId}`),
  listRooms: () => request<Room[]>("/rooms"),
  getRoom: (roomId: string) => request<RoomDetail>(`/rooms/${roomId}`),
  createRoom: (input: { name: string; description?: string; emoji?: string }) =>
    request<Room>("/rooms", { method: "POST", body: input }),
  listMessages: (roomId: string) =>
    request<Message[]>(`/rooms/${roomId}/messages`),
  sendMessage: (roomId: string, userId: string, body: string) =>
    request<Message>(`/rooms/${roomId}/messages`, {
      method: "POST",
      body: { userId, body },
    }),
  listMembers: (roomId: string) =>
    request<User[]>(`/rooms/${roomId}/members`),
  getDashboardSummary: () =>
    request<DashboardSummary>("/dashboard/summary"),
  getRecentActivity: () =>
    request<ActivityItem[]>("/dashboard/recent-activity"),
};
