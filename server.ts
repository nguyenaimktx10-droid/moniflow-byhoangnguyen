import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import type { GoogleAuth } from "google-auth-library";
import cors from "cors";
import dotenv from "dotenv";
import { existsSync } from "fs";

/** Ưu tiên .env.local, sau đó .env */
if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

/** Trùng `src/constants/googleSheets.ts` — ghi đè bằng GOOGLE_SPREADSHEET_ID */
const DEFAULT_SPREADSHEET_ID = "187QOSNn-tDfvkgV1ZgHOc3oK0qd468QrfeStclW2T9k";

const isProduction =
  process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE);

app.set("trust proxy", 1);
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json({ limit: "50mb" }));

function getSpreadsheetId(): string {
  return (process.env.GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID).trim();
}

let cachedSheetsAuth: GoogleAuth | null | undefined;

/** Service Account — chia sẻ bảng tính với email ...@....iam.gserviceaccount.com (Quyền chỉnh sửa). */
function getSheetsAuth(): GoogleAuth | null {
  if (cachedSheetsAuth !== undefined) return cachedSheetsAuth;
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonStr) {
    try {
      const credentials = JSON.parse(jsonStr) as object;
      cachedSheetsAuth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      return cachedSheetsAuth;
    } catch (e) {
      console.error("[moni-flow] GOOGLE_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ:", e);
      cachedSheetsAuth = null;
      return null;
    }
  }
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (keyFile && existsSync(keyFile)) {
    cachedSheetsAuth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return cachedSheetsAuth;
  }
  cachedSheetsAuth = null;
  return null;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/** Trạng thái cấu hình (không lộ secret) */
app.get("/api/sheets-ready", (req, res) => {
  const auth = getSheetsAuth();
  res.json({
    ready: !!auth,
    spreadsheetId: getSpreadsheetId(),
  });
});

app.post("/api/sync-sheets", async (req, res) => {
  const auth = getSheetsAuth();
  if (!auth) {
    return res.status(503).json({
      error:
        "Chưa cấu hình Service Account. Đặt GOOGLE_SERVICE_ACCOUNT_JSON hoặc GOOGLE_APPLICATION_CREDENTIALS trên server.",
      code: "MISSING_SERVICE_ACCOUNT",
    });
  }

  const { transactions } = req.body as {
    transactions?: Array<{
      id: string;
      date: string;
      type: string;
      amount: number;
      category: string;
      note?: string;
      recurring: string;
    }>;
  };

  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: "Missing transactions array" });
  }

  const spreadsheetId = getSpreadsheetId();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const values = [
      ["ID", "Ngày", "Loại", "Số tiền", "Danh mục", "Ghi chú", "Định kỳ"],
      ...transactions.map((t) => [
        t.id,
        t.date,
        t.type,
        t.amount,
        t.category,
        t.note || "",
        t.recurring,
      ]),
    ];

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName =
      spreadsheet.data.sheets?.[0]?.properties?.title || "Sheet1";

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    res.json({ success: true, spreadsheetId });
  } catch (error: unknown) {
    console.error("Sheets sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({
          error: "not_found",
          path: req.path,
        });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[moni-flow] ${isProduction ? "production" : "dev"} → http://0.0.0.0:${PORT}`
    );
  });
}

startServer();
