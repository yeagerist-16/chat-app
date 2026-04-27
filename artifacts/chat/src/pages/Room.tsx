import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { api, type Message } from "@/lib/api";
import { useCurrentUser } from "@/lib/userStore";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Users, Hash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime, formatDateHeader } from "@/lib/format";
import { getSocket } from "@/lib/socket";

export default function Room({ roomId }: { roomId: string }) {
  const { user } = useCurrentUser();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  const roomQ = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => api.getRoom(roomId),
    refetchInterval: 15000,
  });
  const messagesQ = useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => api.listMessages(roomId),
  });
  const membersQ = useQuery({
    queryKey: ["members", roomId],
    queryFn: () => api.listMembers(roomId),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_room", roomId);

    const onLoad = (payload: { roomId: string; messages: Message[] }) => {
      if (payload.roomId !== roomId) return;
      qc.setQueryData<Message[]>(["messages", roomId], payload.messages);
    };

    const onNew = (msg: Message) => {
      if (msg.roomId !== roomId) return;
      qc.setQueryData<Message[]>(["messages", roomId], (prev) => {
        const list = prev ?? [];
        if (list.some((m) => m.id === msg.id)) return list;
        return [...list, msg];
      });
      qc.invalidateQueries({ queryKey: ["room", roomId] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      qc.invalidateQueries({ queryKey: ["recent-activity"] });
    };

    socket.on("load_messages", onLoad);
    socket.on("new_message", onNew);

    return () => {
      socket.emit("leave_room", roomId);
      socket.off("load_messages", onLoad);
      socket.off("new_message", onNew);
    };
  }, [roomId, qc]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.sendMessage(roomId, user!.id, body),
  });

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messagesQ.data?.length]);

  if (!user) return null;

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
    setDraft("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const groups = groupByDay(messagesQ.data ?? []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
            {roomQ.data?.emoji ?? "💬"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <h1 className="font-semibold truncate">{roomQ.data?.name ?? "Loading…"}</h1>
            </div>
            {roomQ.data?.description && (
              <p className="text-xs text-muted-foreground truncate">{roomQ.data.description}</p>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{membersQ.data?.length ?? 0}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-5xl mx-auto w-full">
        <main className="flex-1 flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6" style={{ maxHeight: "calc(100vh - 180px)" }}>
            {messagesQ.isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-2/3" />
              </div>
            )}
            {messagesQ.data && messagesQ.data.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <p className="text-lg">No messages yet</p>
                <p className="text-sm mt-1">Be the first to say something!</p>
              </div>
            )}
            {groups.map((g) => (
              <div key={g.dayKey} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {g.label}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                {g.messages.map((m, idx) => {
                  const prev = g.messages[idx - 1];
                  const grouped = prev && prev.userId === m.userId &&
                    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
                  const mine = m.userId === user.id;
                  return (
                    <MessageRow key={m.id} m={m} grouped={!!grouped} mine={mine} />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t bg-white p-3 sm:p-4">
            <div className="flex items-end gap-2 max-w-5xl mx-auto">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Message #${roomQ.data?.name ?? ""}`}
                className="resize-none min-h-[44px] max-h-32"
                rows={1}
                maxLength={2000}
              />
              <Button
                onClick={handleSend}
                disabled={!draft.trim() || sendMutation.isPending}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {sendMutation.isError && (
              <p className="text-xs text-red-600 mt-1 max-w-5xl mx-auto">
                Failed to send. Try again.
              </p>
            )}
          </div>
        </main>

        <aside className="hidden lg:block w-64 border-l bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Members ({membersQ.data?.length ?? 0})
          </h3>
          <ul className="space-y-2">
            {membersQ.data?.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <UserAvatar displayName={m.displayName} color={m.avatarColor} size="sm" />
                <span className="text-sm">{m.displayName}</span>
                {m.id === user.id && (
                  <span className="text-xs text-muted-foreground">(you)</span>
                )}
              </li>
            ))}
            {membersQ.data?.length === 0 && (
              <li className="text-sm text-muted-foreground">No active members yet.</li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function MessageRow({ m, grouped, mine }: { m: Message; grouped: boolean; mine: boolean }) {
  return (
    <div className={`flex gap-3 ${grouped ? "" : "mt-2"}`}>
      <div className="w-9 shrink-0">
        {!grouped && <UserAvatar displayName={m.userDisplayName} color={m.userAvatarColor} />}
      </div>
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">
              {m.userDisplayName}
              {mine && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
            </span>
            <span className="text-xs text-muted-foreground">{formatTime(m.createdAt)}</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
      </div>
    </div>
  );
}

function groupByDay(messages: Message[]) {
  const groups: { dayKey: string; label: string; messages: Message[] }[] = [];
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let g = groups[groups.length - 1];
    if (!g || g.dayKey !== dayKey) {
      g = { dayKey, label: formatDateHeader(m.createdAt), messages: [] };
      groups.push(g);
    }
    g.messages.push(m);
  }
  return groups;
}
