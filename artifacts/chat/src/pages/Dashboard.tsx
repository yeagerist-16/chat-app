import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/userStore";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Users, Hash, Activity, MessageSquare, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { formatRelative } from "@/lib/format";

export default function Dashboard() {
  const { user, signOut } = useCurrentUser();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  const summaryQ = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.getDashboardSummary,
    refetchInterval: 5000,
  });
  const roomsQ = useQuery({
    queryKey: ["rooms"],
    queryFn: api.listRooms,
    refetchInterval: 5000,
  });
  const activityQ = useQuery({
    queryKey: ["recent-activity"],
    queryFn: api.getRecentActivity,
    refetchInterval: 5000,
  });

  if (!user) return null;

  const stats = summaryQ.data;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Lounge</h1>
              <p className="text-xs text-muted-foreground">Chat together, in real time</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <UserAvatar displayName={user.displayName} color={user.avatarColor} size="sm" />
              <div className="text-sm">
                <div className="font-medium leading-tight">{user.displayName}</div>
                <div className="text-xs text-muted-foreground">Signed in</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-1">Welcome back, {user.displayName.split(" ")[0]} 👋</h2>
          <p className="text-muted-foreground">Here's what's happening in your chat space.</p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Rooms" value={stats?.totalRooms} icon={<Hash className="h-4 w-4" />} />
          <StatCard label="Messages" value={stats?.totalMessages} icon={<MessageSquare className="h-4 w-4" />} />
          <StatCard label="Members" value={stats?.totalUsers} icon={<Users className="h-4 w-4" />} />
          <StatCard
            label="Active today"
            value={stats?.messagesToday}
            sublabel={
              stats ? `${stats.activeRoomsToday} room${stats.activeRoomsToday === 1 ? "" : "s"}` : undefined
            }
            icon={<Activity className="h-4 w-4" />}
          />
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Rooms</h3>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New room
              </Button>
            </div>
            <div className="space-y-3">
              {roomsQ.isLoading && (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              )}
              {roomsQ.data?.map((room) => (
                <Link
                  key={room.id}
                  href={`/rooms/${room.id}`}
                  className="block"
                >
                  <Card className="hover:border-indigo-300 hover:shadow-sm transition cursor-pointer">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
                        {room.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">#{room.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {room.messageCount} msg{room.messageCount === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        {room.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {room.description}
                          </p>
                        )}
                        {room.lastMessagePreview && (
                          <p className="text-sm text-slate-700 line-clamp-1 mt-2">
                            <span className="text-muted-foreground">Last:</span> {room.lastMessagePreview}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                        {room.lastMessageAt ? formatRelative(room.lastMessageAt) : "no activity"}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {roomsQ.data && roomsQ.data.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No rooms yet. Create the first one!
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            <Card>
              <CardContent className="p-2">
                {activityQ.isLoading && (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                )}
                {activityQ.data && activityQ.data.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No activity yet — say hi in any room.
                  </div>
                )}
                <ul className="divide-y">
                  {activityQ.data?.slice(0, 8).map((item) => (
                    <li key={item.messageId}>
                      <button
                        onClick={() => navigate(`/rooms/${item.roomId}`)}
                        className="w-full text-left p-3 hover:bg-slate-50 rounded-md flex gap-3"
                      >
                        <UserAvatar
                          displayName={item.userDisplayName}
                          color={item.userAvatarColor}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-slate-900">{item.userDisplayName}</span>
                            <span>in</span>
                            <span>{item.roomEmoji} #{item.roomName}</span>
                          </div>
                          <p className="text-sm line-clamp-2 mt-0.5">{item.body}</p>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatRelative(item.createdAt)}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <CreateRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(room) => {
          setCreateOpen(false);
          navigate(`/rooms/${room.id}`);
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  icon,
}: {
  label: string;
  value?: number;
  sublabel?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value ?? "—"}</div>
        {sublabel && <CardDescription className="mt-1">{sublabel}</CardDescription>}
      </CardContent>
    </Card>
  );
}
