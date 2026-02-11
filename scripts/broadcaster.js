// scripts/broadcaster.js (The "Smart Executioner" - FIXED & DEBUGGED)
import { createServer } from "http";
import { Server } from "socket.io";
import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL; 
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const TD_API_KEY = "05e7f5f30b384f11936a130f387c4092"; // Your Key

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("🚨 CRITICAL: Missing Supabase Keys in Environment Variables!");
    process.exit(1);
}

// Initialize Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 1. Create HTTP Server
const httpServer = createServer((req, res) => {
  res.writeHead(200);
  res.end("Smart Radio Tower is Online 🟢");
});

// 2. Attach Socket.io
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- 🧠 MEMORY STORAGE ---
let activeTrades = new Map(); 

// 104 Assets
const SYMBOLS = [
    // CRYPTO
    "BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD", "ADA/USD", "DOGE/USD", 
    "AVAX/USD", "DOT/USD", "LINK/USD", "MATIC/USD", "LTC/USD", "UNI/USD", "TRX/USD", 
    "SHIB/USD", "ETC/USD", "NEAR/USD", "ATOM/USD", "XLM/USD", "BCH/USD", "ALGO/USD", 
    "FIL/USD", "VET/USD", "ICP/USD", "GRT/USD", "AAVE/USD", "SAND/USD", "MANA/USD", 
    "AXS/USD", "EOS/USD", "THETA/USD", "RUNE/USD", "KSM/USD", "EGLD/USD", "XTZ/USD",
    // STOCKS
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX", "AMD", "INTC", 
    "CRM", "ADBE", "PYPL", "UBER", "ABNB", "COIN", "PLTR", "JPM", "V", "MA", "WMT", 
    "KO", "PEP", "MCD", "NKE", "TSM", "ASML", "BABA", "SONY", "TM",
    // FOREX
    "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", 
    "EUR/GBP", "EUR/JPY", "EUR/CHF", "GBP/JPY", "GBP/AUD", "GBP/CAD", "AUD/JPY", 
    "AUD/CAD", "CAD/JPY", "CHF/JPY", "USD/SGD", "USD/HKD", "USD/ZAR", "USD/MXN", "USD/TRY",
    // INDICES & COMMODITIES
    "SPY", "QQQ", "DIA", "DAX", "EWU",
    "XAU/USD", "XAG/USD", "XPT/USD", "XPD/USD", "XCU/USD", "WTI", "BRENT", "NG", 
    "CORN", "WEAT", "SOYB", "CANE"
];

console.log("[Tower] 🟡 Starting Smart Tower...");

// --- STEP A: LOAD THE BRAIN ---
async function loadOpenTrades() {
    console.log("[Tower] 🧠 Downloading Active Orders...");
    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('status', 'open');

    if (error) {
        console.error("[Tower] 🔴 Failed to load trades:", error.message);
        return;
    }
    data.forEach(trade => activeTrades.set(trade.id, trade));
    console.log(`[Tower] ✅ Loaded ${activeTrades.size} Active Trades.`);
}

// --- STEP B: SYNC TRADES ---
function subscribeToTradeUpdates() {
    supabase
        .channel('system-trade-watcher')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            if (eventType === 'INSERT' && newRecord.status === 'open') {
                console.log(`[Tower] 🆕 New Trade: #${newRecord.id} (${newRecord.symbol})`);
                activeTrades.set(newRecord.id, newRecord);
            } 
            else if (eventType === 'UPDATE') {
                if (newRecord.status === 'closed') activeTrades.delete(newRecord.id);
                else activeTrades.set(newRecord.id, newRecord);
            } 
            else if (eventType === 'DELETE') {
                activeTrades.delete(oldRecord.id);
            }
        })
        .subscribe();
    console.log("[Tower] 👀 Watching for New Orders...");
}

// --- STEP C: EXECUTE ---
async function closeTrade(trade, currentPrice, reason) {
    activeTrades.delete(trade.id);
    console.log(`[Tower] ⚡ EXECUTING CLOSE: #${trade.id} | ${reason} | $${currentPrice}`);

    try {
        let pnl = 0;
        if (trade.type === 'buy') {
            pnl = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.size;
        } else {
            pnl = ((trade.entry_price - currentPrice) / trade.entry_price) * trade.size;
        }

        const returnAmount = trade.margin + pnl;
        const { data: account } = await supabase.from('trading_accounts').select('balance').eq('id', trade.account_id).single();

        if (account) {
            await supabase.from('trading_accounts').update({ balance: account.balance + returnAmount }).eq('id', trade.account_id);
        }

        await supabase.from('trades').update({ 
            status: 'closed', exit_price: currentPrice, pnl: pnl, closed_at: new Date().toISOString() 
        }).eq('id', trade.id);

        io.emit('trade_closed', { id: trade.id, pnl, reason });

    } catch (err) {
        console.error(`[Tower] ☠️ ERROR closing trade #${trade.id}:`, err);
    }
}

// --- STEP D: MARKET CONNECTION ---
let ws;
let heartbeatInterval;

function connectTwelveData() {
    // 🛑 Clear any existing heartbeat
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    console.log(`[Tower] 📡 Connecting to TwelveData with Key: ...${TD_API_KEY.slice(-4)}`);
    ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${TD_API_KEY}`);

    ws.on('open', () => {
        console.log("[Tower] 🟢 WebSocket OPEN. Sending Subscription...");
        ws.send(JSON.stringify({ action: "subscribe", params: { symbols: SYMBOLS.join(',') } }));
        
        // ❤️ START HEARTBEAT (Every 10 seconds)
        heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "heartbeat" }));
            }
        }, 10000);
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            // 1. HANDLE PRICE UPDATES
            if (msg.event === 'price') {
                const currentPrice = parseFloat(msg.price);
                const symbol = msg.symbol;

                io.emit('price_update', { symbol: symbol, price: currentPrice });

                for (const [id, trade] of activeTrades.entries()) {
                    if (trade.symbol !== symbol) continue;
                    
                    // Logic checks (Liquidation, TP, SL)...
                    if (trade.liquidation_price && trade.liquidation_price > 0) {
                        if ((trade.type === 'buy' && currentPrice <= trade.liquidation_price) || 
                            (trade.type === 'sell' && currentPrice >= trade.liquidation_price)) {
                            closeTrade(trade, currentPrice, 'LIQUIDATION');
                        }
                    }
                    if (trade.stop_loss) {
                        if ((trade.type === 'buy' && currentPrice <= trade.stop_loss) || 
                            (trade.type === 'sell' && currentPrice >= trade.stop_loss)) {
                            closeTrade(trade, currentPrice, 'STOP_LOSS');
                        }
                    }
                    if (trade.take_profit) {
                        if ((trade.type === 'buy' && currentPrice >= trade.take_profit) || 
                            (trade.type === 'sell' && currentPrice <= trade.take_profit)) {
                            closeTrade(trade, currentPrice, 'TAKE_PROFIT');
                        }
                    }
                }
            } 
            // 2. 🚨 LOG ERRORS OR OTHER EVENTS
            else if (msg.event === 'heartbeat') {
                // Heartbeat ack, ignore.
            } else {
                console.log("[Tower] ⚠️ UNEXPECTED MSG:", JSON.stringify(msg));
            }

        } catch (e) { 
            console.error("[Tower] ❌ Parse Error:", e.message);
        }
    });

    ws.on('close', () => {
        console.log('[Tower] 🔴 Connection Closed. Retrying in 5s...');
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        setTimeout(connectTwelveData, 5000);
    });
    
    ws.on('error', (err) => {
        console.error('[Tower] 🔥 WebSocket Error:', err.message);
    });
}

// --- BOOT UP ---
(async () => {
    await loadOpenTrades();
    subscribeToTradeUpdates();
    connectTwelveData();
})();

const PORT = process.env.PORT || 3000; 
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Smart Tower Active on Port ${PORT}`);
});