import express from "express";
import { Connection } from "@solana/web3.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

const connection = new Connection(RPC_URL, "confirmed");

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Supply endpoint
app.get("/api/v1/supply", async (_req, res) => {
  try {
    // In production: fetch from stablecoin account
    res.json({
      totalMinted: 0,
      totalBurned: 0,
      circulatingSupply: 0,
      decimals: 6,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mint endpoint
app.post("/api/v1/mint", async (req, res) => {
  try {
    const { recipient, amount, reference } = req.body;
    console.log(`Mint request: ${amount} to ${recipient} (ref: ${reference})`);
    // In production: build and send mint transaction
    res.json({ status: "pending", reference });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Burn endpoint
app.post("/api/v1/burn", async (req, res) => {
  try {
    const { amount, from, reference } = req.body;
    console.log(`Burn request: ${amount} from ${from} (ref: ${reference})`);
    res.json({ status: "pending", reference });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Blacklist endpoints (SSS-2)
app.post("/api/v1/compliance/blacklist", async (req, res) => {
  try {
    const { address, reason, reference } = req.body;
    console.log(`Blacklist add: ${address} - ${reason} (ref: ${reference})`);
    res.json({ status: "pending", reference });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/v1/compliance/blacklist/:address", async (req, res) => {
  try {
    console.log(`Blacklist remove: ${req.params.address}`);
    res.json({ status: "pending" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/v1/compliance/blacklist/:address", async (req, res) => {
  try {
    // In production: check on-chain blacklist PDA
    res.json({ blacklisted: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Seize endpoint (SSS-2)
app.post("/api/v1/compliance/seize", async (req, res) => {
  try {
    const { from, treasury, reference } = req.body;
    console.log(`Seize request: from ${from} to ${treasury} (ref: ${reference})`);
    res.json({ status: "pending", reference });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Events endpoint
app.get("/api/v1/events", async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    // In production: query indexed events
    res.json({ events: [], total: 0, limit: Number(limit), offset: Number(offset) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook management
const webhooks: any[] = [];

app.post("/api/v1/webhooks", (req, res) => {
  const { url, events, secret } = req.body;
  const id = `wh_${Date.now()}`;
  webhooks.push({ id, url, events, secret });
  res.json({ id });
});

app.get("/api/v1/webhooks", (_req, res) => {
  res.json({ webhooks: webhooks.map(w => ({ id: w.id, url: w.url, events: w.events })) });
});

app.delete("/api/v1/webhooks/:id", (req, res) => {
  const idx = webhooks.findIndex(w => w.id === req.params.id);
  if (idx >= 0) webhooks.splice(idx, 1);
  res.json({ deleted: true });
});

app.listen(PORT, () => {
  console.log(`SSS Backend running on port ${PORT}`);
  console.log(`RPC: ${RPC_URL}`);
});
