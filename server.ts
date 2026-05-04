import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Extraction Endpoint
  app.post("/api/ai/extract", async (req, res) => {
    const { base64, fileData, mimeType, prompt } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY no está configurada en el servidor." });
    }

    try {
      let finalBase64 = base64;
      let finalMimeType = mimeType || "application/pdf";

      // Handle Data URL if provided instead of raw base64
      if (fileData && fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          finalMimeType = matches[1];
          finalBase64 = matches[2];
        }
      }

      if (!finalBase64) {
        return res.status(400).json({ error: "No se proporcionaron datos de archivo válidos." });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent([
        { text: prompt || "TRANSCRIPCIÓN LITERAL: Extrae TODO el texto de este documento exactamente como aparece. NO resumas. NO omitas información. NO utilices formato Markdown (sin negritas, sin asteriscos, sin listas con guiones). Devuelve ÚNICAMENTE el texto extraído en formato de texto plano puro. No agregues comentarios introductorios ni conclusiones." },
        { 
          inlineData: {
            data: finalBase64,
            mimeType: finalMimeType
          }
        }
      ]);

      let text = result.response.text();
      
      // Intensive cleaning of markdown and symbols that confuse the user
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/__/g, '')
        .replace(/#/g, '')
        .replace(/`{3,}/g, '')
        .replace(/>/g, '')
        .replace(/- /g, '') // Remove bullet points style
        .trim();
      
      res.json({ text });
    } catch (error: any) {
      console.error("Error in AI extraction:", error);
      res.status(500).json({ error: error.message || "Error procesando el documento con IA" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Que Pollo API is running" });
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
