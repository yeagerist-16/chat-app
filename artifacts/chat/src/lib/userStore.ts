import { useEffect, useState, useCallback } from "react";
import { api, type User } from "./api";

const STORAGE_KEY = "chat:user";

function readStored(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStored(user: User | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(() => readStored());
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const stored = readStored();
    if (!stored) return;
    setLoading(true);
    api
      .getUser(stored.id)
      .then((fresh) => {
        setUser(fresh);
        writeStored(fresh);
      })
      .catch(() => {
        writeStored(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (displayName: string) => {
    const u = await api.createUser(displayName);
    writeStored(u);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(() => {
    writeStored(null);
    setUser(null);
  }, []);

  return { user, loading, signIn, signOut };
}
