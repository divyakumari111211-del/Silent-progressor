require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI API is not configured yet. Add OPENAI_API_KEY to your .env file, restart the server, and try again."
    });
  }

  const message = String(req.body?.message || "").slice(0, 12000);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
  if (!message.trim()) return res.status(400).json({ error: "Please enter a message." });

  const input = [
    {
      role: "system",
      content: "You are SILENT PROGRESSOR, a friendly personal AI assistant. Reply in simple English or Hindi/Hinglish depending on the user. Help with general chat, Class 9 study explanations, safe fitness planning, and organizing tasks. Be honest about limitations. Do not claim to have completed actions outside this app. For medical, legal, or other high-stakes issues, give general information and recommend a trusted adult or qualified professional when appropriate."
    },
    ...history.map(item => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content || "").slice(0, 4000)
    })),
    { role: "user", content: message }
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input
      })
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "The AI provider returned an error."
      });
    }
    const answer = data.output
      ?.flatMap(item => item.content || [])
      ?.filter(item => item.type === "output_text")
      ?.map(item => item.text)
      ?.join("\n") || "I couldn't generate a reply this time.";
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not reach the AI service. Check your internet connection and server logs." });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`SILENT PROGRESSOR running at http://localhost:${port}`));