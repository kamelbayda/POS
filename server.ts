import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body-parsing
  app.use(express.json({ limit: "20mb" }));

  // REST API proxy endpoint to bypass Client reCAPTCHA checks inside Windows EXE wraps
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "الرجاء توفير بريد إلكتروني صالح." });
      }

      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (!fs.existsSync(configPath)) {
        return res.status(404).json({ error: "ملف إعدادات Firebase غير موجود في السيرفر." });
      }

      const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const apiKey = configData.apiKey;
      if (!apiKey) {
        return res.status(400).json({ error: "مفتاح الربط مع مشروع Firebase غير متواجد بالملف." });
      }

      const fetchUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
      const apiResponse = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email: email.trim(),
        }),
      });

      const responseBody: any = await apiResponse.json();

      if (!apiResponse.ok) {
        const firebaseErrCode = responseBody?.error?.message || "فشلت عملية إرسال بريد استعادة كلمة المرور.";
        return res.status(400).json({ error: firebaseErrCode });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Server API password reset error:", error);
      return res.status(500).json({ error: error?.message || "فشل إرسال بريد استعادة كلمة المرور من المخدم." });
    }
  });

  // Endpoint to download the full project source code as a ZIP archive
  app.get(["/api/download-zip", "/download-zip", "/pos-project-source.zip"], (req, res) => {
    const zipPath = path.join(process.cwd(), "public", "pos-project-source.zip");
    if (!fs.existsSync(zipPath)) {
      return res.status(404).send("الملف غير متوفر حالياً، يرجى المحاولة لاحقاً.");
    }
    res.setHeader("Content-Disposition", 'attachment; filename="pos-system-source.zip"');
    res.setHeader("Content-Type", "application/zip");
    return res.sendFile(zipPath);
  });

  // Serve static dist in production, use Vite in development
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
