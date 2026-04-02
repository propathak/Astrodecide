// Local storage helpers — no Supabase needed to start

export interface UserProfile {
  name: string;
  dob: string;       // DD/MM/YYYY
  tob: string;       // HH:MM
  pob: string;       // place name
  lat: number;
  lon: number;
  tzone: number;
}

export interface ChartData {
  planets: Array<{
    name: string;
    sign: string;
    house: number;
    nakshatra: string;
    degree: number;
    retrograde: boolean;
  }>;
  ascendant: { sign: string; degree: number };
  sun: { sign: string };
  moon: { sign: string };
  dasha: { planet: string; end_date: string };
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const PROFILE_KEY = "astrodecide_profile";
const CHART_KEY = "astrodecide_chart";
const CHAT_KEY = "astrodecide_chat";

export function saveProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveChart(chart: ChartData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHART_KEY, JSON.stringify(chart));
}

export function getChart(): ChartData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CHART_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveMessages(messages: Message[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
}

export function getMessages(): Message[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CHAT_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function clearAll() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(CHART_KEY);
  localStorage.removeItem(CHAT_KEY);
}
