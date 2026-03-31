import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import type { CookieOptions } from "express";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

/** Cloud Run / production: NODE_ENV hoặc biến mặc định của nền tảng. */
const isProduction =
  process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE);

app.set("trust proxy", 1);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

/** Redirect URI phải trùng URL đang mở app (localhost hoặc Cloud Run). */
function getOAuthRedirectUri(req: express.Request): string {
  const host = req.get("host") || `localhost:${PORT}`;
  let proto = (req.get("x-forwarded-proto") || req.protocol || "http").trim();
  if (proto.includes(",")) proto = proto.split(",")[0].trim();
  if (proto !== "http" && proto !== "https") proto = "https";
  return `${proto}://${host}/auth/callback`;
}

function createOAuth2Client(req: express.Request) {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  return new google.auth.OAuth2(id, secret, getOAuthRedirectUri(req));
}

function createBareOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

function getSessionCookieOpts(req: express.Request): CookieOptions {
  const secure =
    req.secure ||
    req.get("x-forwarded-proto")?.split(",")[0].trim() === "https";
  return {
    secure,
    sameSite: secure ? "none" : "lax",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function clearSessionCookieOpts(req: express.Request): CookieOptions {
  const secure =
    req.secure ||
    req.get("x-forwarded-proto")?.split(",")[0].trim() === "https";
  return {
    secure,
    sameSite: secure ? "none" : "lax",
    httpOnly: true,
    path: "/",
  };
}

function requireGoogleEnv(res: express.Response): boolean {
  if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    res.status(503).json({
      error:
        "Chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET trên server (biến môi trường hoặc file .env).",
      code: "MISSING_OAUTH_ENV",
    });
    return false;
  }
  return true;
}

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/auth/url", (req, res) => {
  if (!requireGoogleEnv(res)) return;
  try {
    const oauth2Client = createOAuth2Client(req);
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
      prompt: "consent",
    });
    res.json({ url });
  } catch (e: unknown) {
    console.error("generateAuthUrl:", e);
    res.status(500).json({
      error: e instanceof Error ? e.message : "Không tạo được URL đăng nhập Google.",
      code: "AUTH_URL_FAILED",
    });
  }
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    return res.status(400).send("Missing authorization code");
  }
  if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    return res.status(503).send("Server OAuth chưa được cấu hình.");
  }
  try {
    const oauth2Client = createOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);
    res.cookie("google_tokens", JSON.stringify(tokens), getSessionCookieOpts(req));

    res.send(`
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            (function () {
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            })();
          </script>
          <p>Đăng nhập thành công. Cửa sổ sẽ đóng tự động.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send(
      "Authentication failed: " +
        (error instanceof Error ? error.message : "unknown")
    );
  }
});

app.post("/api/sync-sheets", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) {
    return res.status(401).json({ error: "Not authenticated with Google" });
  }

  const { transactions, spreadsheetId } = req.body;
  const tokens = JSON.parse(tokensStr);
  const oauth2Client = createBareOAuth2Client();
  oauth2Client.setCredentials(tokens);

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  try {
    let targetSpreadsheetId = spreadsheetId;

    if (!targetSpreadsheetId) {
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Moni Flow - CEO Hoàng Nguyên - ${new Date().toLocaleDateString()}`,
          },
        },
      });
      targetSpreadsheetId = spreadsheet.data.spreadsheetId;
    }

    const values = [
      ["ID", "Ngày", "Loại", "Số tiền", "Danh mục", "Ghi chú", "Định kỳ"],
      ...transactions.map((t: {
        id: string;
        date: string;
        type: string;
        amount: number;
        category: string;
        note?: string;
        recurring: string;
      }) => [
        t.id,
        t.date,
        t.type,
        t.amount,
        t.category,
        t.note || "",
        t.recurring,
      ]),
    ];

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: targetSpreadsheetId,
    });
    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || "Sheet1";

    await sheets.spreadsheets.values.update({
      spreadsheetId: targetSpreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    res.json({ success: true, spreadsheetId: targetSpreadsheetId });
  } catch (error: unknown) {
    console.error("Sheets sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/auth/status", (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ isAuthenticated: !!tokens });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("google_tokens", clearSessionCookieOpts(req));
  res.json({ success: true });
});

// Vite middleware (dev) hoặc static dist (production / Cloud Run)
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
      if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
        return res.status(404).json({
          error: "not_found",
          path: req.path,
          hint: "API routes must be registered; check server.ts order.",
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
