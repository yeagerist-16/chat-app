import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api, type Room } from "@/lib/api";

const EMOJIS = ["💬", "🎲", "🎨", "🚀", "🔥", "🌱", "☕", "🎵", "📚", "🧠", "🐙", "🌈"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (room: Room) => void;
}

export function CreateRoomDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.createRoom({ name: name.trim(), description: description.trim(), emoji }),
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setName("");
      setDescription("");
      setEmoji("💬");
      onCreated(room);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to create room."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Room name is required.");
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new room</DialogTitle>
            <DialogDescription>
              Rooms are public — anyone in the lounge can join and chat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Emoji</label>
              <div className="flex flex-wrap gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`h-9 w-9 rounded-md text-xl transition ${
                      emoji === e ? "bg-indigo-100 ring-2 ring-indigo-500" : "hover:bg-slate-100"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="roomName">Name</label>
              <Input
                id="roomName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. design-feedback"
                maxLength={64}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="roomDesc">Description (optional)</label>
              <Textarea
                id="roomDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this room about?"
                maxLength={200}
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
