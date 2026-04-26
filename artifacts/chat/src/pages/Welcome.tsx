import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/lib/userStore";
import { MessageSquare } from "lucide-react";

export default function Welcome() {
  const { signIn } = useCurrentUser();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a display name.");
      return;
    }
    if (trimmed.length > 32) {
      setError("Display name must be 32 characters or fewer.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <MessageSquare className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Welcome to Lounge</CardTitle>
          <CardDescription>
            Pick a display name to start chatting. No password, no email — just jump in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="displayName">
                Display name
              </label>
              <Input
                id="displayName"
                autoFocus
                placeholder="e.g. Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                disabled={submitting}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Joining…" : "Enter the lounge"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Your name is stored locally so you can come back anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
