import { google } from "googleapis";

type LogEvent = "login" | "onboarding" | "question" | "payment_initiated" | "payment_success";

interface LogPayload {
  event: LogEvent;
  userId: string;
  email: string;
  meta?: {
    question?: string;
    category?: string;
    amount?: number;
    name?: string;
    pob?: string;
  };
}

export async function appendToSheet(payload: LogPayload): Promise<void> {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (
    !process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
    !privateKey ||
    !process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  ) {
    // Sheets not configured — skip silently
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    new Date().toISOString(),
    payload.userId,
    payload.email,
    payload.event,
    payload.meta?.question ?? "",
    payload.meta?.category ?? "",
    payload.meta?.amount ?? "",
    payload.meta?.name ?? "",
    payload.meta?.pob ?? "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: "Events!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}
