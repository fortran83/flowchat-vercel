import Database from 'better-sqlite3';
import path from 'path';

// Railway has an ephemeral filesystem — use in-memory DB on cloud, file-based locally
const IS_CLOUD = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RENDER;
const DB_PATH = IS_CLOUD ? ':memory:' : path.join(process.cwd(), 'flowchat.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT UNIQUE NOT NULL,
      contact_name TEXT NOT NULL,
      contact_id TEXT,
      campaign_id TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      sf_record_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_id TEXT,
      campaign_id TEXT,
      message_type TEXT NOT NULL,
      message_text TEXT NOT NULL,
      buttons_json TEXT,
      direction TEXT NOT NULL DEFAULT 'inbound',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      button_id TEXT NOT NULL,
      button_text TEXT NOT NULL,
      sf_update_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      conversation_id TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function upsertConversation(
  conversationId: string,
  contactName: string,
  contactId: string | null,
  campaignId: string | null
): void {
  const d = getDb();
  d.prepare(`
    INSERT INTO conversations (conversation_id, contact_name, contact_id, campaign_id, status, updated_at)
    VALUES (?, ?, ?, ?, 'waiting', datetime('now'))
    ON CONFLICT(conversation_id) DO UPDATE SET
      contact_name = excluded.contact_name,
      contact_id = excluded.contact_id,
      campaign_id = excluded.campaign_id,
      status = 'waiting',
      updated_at = datetime('now')
  `).run(conversationId, contactName, contactId, campaignId);
}

export function insertMessage(
  conversationId: string,
  contactName: string,
  contactId: string | null,
  campaignId: string | null,
  messageType: string,
  messageText: string,
  buttonsJson: string | null,
  direction: 'inbound' | 'outbound'
): void {
  getDb().prepare(`
    INSERT INTO messages (conversation_id, contact_name, contact_id, campaign_id, message_type, message_text, buttons_json, direction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(conversationId, contactName, contactId, campaignId, messageType, messageText, buttonsJson, direction);
}

export function insertResponse(
  conversationId: string,
  buttonId: string,
  buttonText: string,
  sfStatus: 'pending' | 'success' | 'failed' | 'skipped'
): void {
  getDb().prepare(`
    INSERT INTO responses (conversation_id, button_id, button_text, sf_update_status)
    VALUES (?, ?, ?, ?)
  `).run(conversationId, buttonId, buttonText, sfStatus);
}

export function updateResponseStatus(
  conversationId: string,
  sfStatus: 'success' | 'failed'
): void {
  getDb().prepare(`
    UPDATE responses SET sf_update_status = ?
    WHERE conversation_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).run(sfStatus, conversationId);
}

export function updateConversationStatus(
  conversationId: string,
  status: 'waiting' | 'responded' | 'closed',
  sfRecordId?: string
): void {
  if (sfRecordId) {
    getDb().prepare(`
      UPDATE conversations SET status = ?, sf_record_id = ?, updated_at = datetime('now')
      WHERE conversation_id = ?
    `).run(status, sfRecordId, conversationId);
  } else {
    getDb().prepare(`
      UPDATE conversations SET status = ?, updated_at = datetime('now')
      WHERE conversation_id = ?
    `).run(status, conversationId);
  }
}

export function getConversation(conversationId: string) {
  return getDb().prepare(`SELECT * FROM conversations WHERE conversation_id = ?`).get(conversationId);
}

export function getMessages(conversationId: string) {
  return getDb().prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`).all(conversationId);
}

export function getAllConversations() {
  return getDb().prepare(`SELECT * FROM conversations ORDER BY updated_at DESC`).all();
}

export function audit(eventType: string, conversationId: string | null, payload: unknown): void {
  getDb().prepare(`
    INSERT INTO audit_logs (event_type, conversation_id, payload_json)
    VALUES (?, ?, ?)
  `).run(eventType, conversationId, JSON.stringify(payload));
}

export function resetConversation(conversationId: string): void {
  const d = getDb();
  d.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(conversationId);
  d.prepare(`DELETE FROM responses WHERE conversation_id = ?`).run(conversationId);
  d.prepare(`DELETE FROM conversations WHERE conversation_id = ?`).run(conversationId);
}
