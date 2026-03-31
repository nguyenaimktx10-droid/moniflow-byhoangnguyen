import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/callback`
);

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/auth/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file"
    ],
    prompt: "consent"
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Store tokens in a secure cookie
    res.cookie("google_tokens", JSON.stringify(tokens), {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/sync-sheets", async (req, res) => {
  const tokensStr = req.cookies.google_tokens;
  if (!tokensStr) {
    return res.status(401).json({ error: "Not authenticated with Google" });
  }

  const { transactions, spreadsheetId } = req.body;
  const tokens = JSON.parse(tokensStr);
  oauth2Client.setCredentials(tokens);

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  try {
    let targetSpreadsheetId = spreadsheetId;

    // If no spreadsheetId provided, create a new one
    if (!targetSpreadsheetId) {
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Moni Flow - CEO Hoàng Nguyên - ${new Date().toLocaleDateString()}`
          }
        }
      });
      targetSpreadsheetId = spreadsheet.data.spreadsheetId;
    }

    // Prepare data for sheets
    const values = [
      ["ID", "Ngày", "Loại", "Số tiền", "Danh mục", "Ghi chú", "Định kỳ"],
      ...transactions.map((t: any) => [
        t.id,
        t.date,
        t.type,
        t.amount,
        t.category,
        t.note || "",
        t.recurring
      ])
    ];

    // Get the first sheet's name dynamically
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: targetSpreadsheetId
    });
    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || "Sheet1";

    // Clear existing data and write new data
    await sheets.spreadsheets.values.update({
      spreadsheetId: targetSpreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values }
    });

    res.json({ success: true, spreadsheetId: targetSpreadsheetId });
  } catch (error: any) {
    console.error("Sheets sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/auth/status", (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ isAuthenticated: !!tokens });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("google_tokens", {
    secure: true,
    sameSite: "none",
    httpOnly: true
  });
  res.json({ success: true });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
