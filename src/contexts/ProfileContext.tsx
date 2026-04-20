"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Profile {
  name: string;
  rising: string;
  moon: string;
  sun: string;
  dasha: string;
  dashaEnd: string;
  dashaDescription: string;
  traits: string[];
  summary: string;
  insights: { career: string; relationships: string; self: string };
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

const ProfileContext = createContext<ProfileState | null>(null);

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [initialized, setInitialized] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (initialized) return;          // never re-fetch on tab switch
    setInitialized(true);
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  return (
    <ProfileContext.Provider value={{ profile, loading, error, retry: load }}>
      {children}
    </ProfileContext.Provider>
  );
}
