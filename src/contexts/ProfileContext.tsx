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
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;          // never re-fetch on tab switch
    setInitialized(true);

    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialized]);

  return (
    <ProfileContext.Provider value={{ profile, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}
