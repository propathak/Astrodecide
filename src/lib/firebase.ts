import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App;
let db: Firestore;

function getFirebaseApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export function getDb(): Firestore {
  if (!db) {
    app = getFirebaseApp();
    db = getFirestore(app);
  }
  return db;
}

// Firestore collection references
export const COLLECTIONS = {
  USERS:         "users",
  CHARTS:        "charts",
  QUESTIONS:     "questions",
  PAYMENTS:      "payments",
  COUPONS:       "coupons",
  CONVERSATIONS: "conversations",
} as const;

// User document shape
export interface UserDoc {
  name: string;
  email: string;
  image: string;
  dob?: string;
  tob?: string;
  pob?: string;
  lat?: number;
  lon?: number;
  tzone?: number;
  onboardingDone: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  lastLoginAt: FirebaseFirestore.Timestamp;
  paymentStatus: "free" | "active" | "expired";
  passExpiresAt: FirebaseFirestore.Timestamp | null;
  freeQuestionsUsed: number;
  totalQuestions: number;
}

// Chart document shape
export interface ChartDoc {
  userId: string;
  chartData: string; // JSON stringified
  dashaData: string; // JSON stringified
  ascendantSign: string;
  sunSign: string;
  moonSign: string;
  computedAt: FirebaseFirestore.Timestamp;
  source: "ephemeris" | "astrologyapi";
}

// Question document shape
export interface QuestionDoc {
  userId: string;
  question: string;
  category: string | null;
  answer: string;
  confidenceScore: number;
  bestTimeWindows: string[];
  doList: string[];
  avoidList: string[];
  waitList: string[];
  dashaContext: string;
  wasPaid: boolean;
  createdAt: FirebaseFirestore.Timestamp;
}

// Payment document shape
export interface PaymentDoc {
  userId: string;
  orderId: string;
  paymentId: string | null;
  signature: string | null;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed";
  passType: "daily";
  createdAt: FirebaseFirestore.Timestamp;
  paidAt: FirebaseFirestore.Timestamp | null;
}
