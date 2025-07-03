// server.js
const express = require("express");
const fetch   = require("node-fetch");
const app     = express();

const PORT    = process.env.PORT || 3000;
const RPC_URL = "https://api.mainnet-beta.solana.com";

// ────────────────────────────────────────────────────────────
//  CoinGecko “simple/price” endpoints
// ────────────────────────────────────────────────────────────
const COINGECKO_SOL_URL       = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const COINGECKO_STRONGSOL_URL = "https://api.coingecko.com/api/v3/simple/price?ids=stronghold-staked-sol&vs_currencies=usd"; // API-ID on CG is “stronghold-staked-sol” :contentReference[oaicite:0]{index=0}

// Wallets to track
const wallets = [
  "Cx46fVnmtGBpGJtsdQMWhHTfGkKnswJHx1QhSCp16DWF",
  "91oPXTs2oq8VvJpQ5TnvXakFGnnJSpEB6HFWDtSctwMt",
  "Ac1beBKixfNdrTAac7GRaTsJTxLyvgGvJjvy4qQfvyfc"
];

// ────────────────────────────────────────────────────────────
//  CORS + simple request logging
// ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log("User-Agent:", req.get("User-Agent"));
  res.set("Access-Control-Allow-Origin", "*");
  next();
});

// ────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────
async function getSolBalance(address) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id:      1,
      method:  "getBalance",
      params:  [address]
    })
  });

  const data     = await response.json();
  const lamports = data.result?.value || 0;
  return lamports / 1_000_000_000;        // SOL = 1 G-lamport
}

async function getSolUsdPrice() {
  const response = await fetch(COINGECKO_SOL_URL);
  const data     = await response.json();
  return data.solana.usd;
}

async function getStrongSolUsdPrice() {
  const response = await fetch(COINGECKO_STRONGSOL_URL);
  const data     = await response.json();
  return data["stronghold-staked-sol"].usd;
}

// ────────────────────────────────────────────────────────────
//  CSV endpoints
// ────────────────────────────────────────────────────────────
app.get("/balances.csv", async (_req, res) => {
  let csv = "wallet,SOL balance\n";
  for (const wallet of wallets) {
    const balance = await getSolBalance(wallet);
    csv += `${wallet},${balance}\n`;
  }
  res.type("text/csv").send(csv);
});

// SOL price
app.get("/solprice.csv", async (_req, res) => {
  const price = await getSolUsdPrice();
  res.type("text/csv").send(`solana,${price}`);
});

// NEW: STRONGSOL price
app.get("/strongsolprice.csv", async (_req, res) => {
  const price = await getStrongSolUsdPrice();
  res.type("text/csv").send(`strongsol,${price}`);
});

// ────────────────────────────────────────────────────────────
//  HEAD endpoints (uptime pingers)
// ────────────────────────────────────────────────────────────
function headOk(route) {
  app.head(route, (_req, res) => res.type("text/csv").status(200).end());
}
headOk("/balances.csv");
headOk("/solprice.csv");
headOk("/strongsolprice.csv");   // ✅ new

// ────────────────────────────────────────────────────────────
//  Minimal home page
// ────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.send(
    "✅ Solana CSV API is running<br>" +
    "<a href='/balances.csv'>Balances</a> | " +
    "<a href='/solprice.csv'>SOL Price</a> | " +
    "<a href='/strongsolprice.csv'>STRONGSOL Price</a>"
  );
});

// ────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
