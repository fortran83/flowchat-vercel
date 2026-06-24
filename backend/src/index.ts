import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import { createMessagesRouter } from './routes/messages.js';
import { createFlowRouter } from './routes/flow.js';
import { getDb } from './services/database.js';
import { isSalesforceEnabled } from './services/salesforce.js';

const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const ALLOWED_ORIGINS = [
  FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://localhost:4173',
];

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    salesforceEnabled: isSalesforceEnabled(),
    timestamp: new Date().toISOString(),
  });
});

// Status
app.get('/api/status', (_req, res) => {
  res.json({
    salesforceEnabled: isSalesforceEnabled(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/messages', createMessagesRouter(io));
app.use('/api/flow', createFlowRouter(io));

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

// Ensure DB is initialized before starting
getDb();

server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════╗`);
  console.log(`║   FlowChat Backend  v1.0.0       ║`);
  console.log(`╠══════════════════════════════════╣`);
  console.log(`║  HTTP  : http://localhost:${PORT}   ║`);
  console.log(`║  WS    : ws://localhost:${PORT}     ║`);
  console.log(`║  SF    : ${isSalesforceEnabled() ? 'ENABLED  ' : 'DISABLED '}                  ║`);
  console.log(`╚══════════════════════════════════╝\n`);
});
