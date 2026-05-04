import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Que Pollo API is running" });
  });

  // Config Status Check
  app.get("/api/config/status", (req, res) => {
    res.json({
      emailReady: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      aiReady: !!process.env.GEMINI_API_KEY
    });
  });

  // AI Extraction Endpoint
  app.post("/api/ai/extract", async (req, res) => {
    const { base64, fileData, mimeType, prompt } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("[AI Extract] Error: GEMINI_API_KEY is not defined.");
      return res.status(500).json({ error: "La llave API de Gemini no está configurada." });
    }

    try {
      let finalBase64 = base64;
      let finalMimeType = mimeType || "application/pdf";

      if (fileData && fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          finalMimeType = matches[1];
          finalBase64 = matches[2];
        }
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent([
        { text: prompt || "Extrae el texto de este documento." },
        { 
          inlineData: {
            data: finalBase64,
            mimeType: finalMimeType
          }
        }
      ]);

      let text = result.response.text();
      text = text.replace(/\*/g, '').trim();
      
      res.json({ text });
    } catch (error: any) {
      console.error("Error in AI extraction:", error);
      res.status(500).json({ error: error.message || "Error procesando con IA" });
    }
  });

  // Email Endpoint for Payroll
  app.post("/api/email/payroll", async (req, res) => {
    const { to, subject, html, attachments } = req.body;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("[Email] Missing credentials: EMAIL_USER or EMAIL_PASS not set.");
      return res.status(500).json({ 
        error: "Credenciales de correo no configuradas. Por favor agregue EMAIL_USER y EMAIL_PASS en los ajustes de AI Studio." 
      });
    }

    try {
      console.log(`[Email] Attempting to send payroll to ${to}`);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Verify connection before sending
      await transporter.verify();

      await transporter.sendMail({
        from: `"Que Pollo - Nómina" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments: attachments || []
      });

      res.json({ success: true, message: "Correo enviado correctamente." });
    } catch (error: any) {
      console.error("[Email Error]:", error);
      let userFriendlyMessage = "Error al enviar el correo.";
      
      if (error.code === 'EAUTH') {
        userFriendlyMessage = "Error de autenticación: El correo o la contraseña de aplicación son incorrectos.";
      }
      
      res.status(500).json({ 
        error: userFriendlyMessage,
        details: error.message 
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
