import { Router, Request, Response } from 'express';
import { Server as IOServer } from 'socket.io';
import { IncomingMessage } from '../types/index.js';
import {
  upsertConversation,
  insertMessage,
  insertResponse,
  updateResponseStatus,
  updateConversationStatus,
  resetConversation,
  getMessages,
  getConversation,
  getAllConversations,
  audit,
} from '../services/database.js';
import { updateConversationResponse, isSalesforceEnabled } from '../services/salesforce.js';

export function createMessagesRouter(io: IOServer): Router {
  const router = Router();

  // POST /api/messages — called by Salesforce Flow
  router.post('/', async (req: Request, res: Response) => {
    const body = req.body as IncomingMessage;

    if (!body.conversationId || !body.contactName || !body.message?.text) {
      return res.status(400).json({ error: 'conversationId, contactName, and message.text are required' });
    }

    const {
      conversationId,
      contactName,
      contactId = null,
      campaignId = null,
      message,
      buttons = [],
    } = body;

    upsertConversation(conversationId, contactName, contactId, campaignId);
    insertMessage(
      conversationId,
      contactName,
      contactId,
      campaignId,
      message.type,
      message.text,
      buttons.length ? JSON.stringify(buttons) : null,
      'inbound'
    );
    audit('message_received', conversationId, body);

    // Push to all connected clients
    io.emit('new_message', {
      conversationId,
      contactName,
      contactId,
      campaignId,
      message,
      buttons,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({ status: 'delivered', conversationId });
  });

  // POST /api/messages/respond — called by the frontend when user clicks a button
  router.post('/respond', async (req: Request, res: Response) => {
    const { conversationId, buttonId, buttonText } = req.body as {
      conversationId: string;
      buttonId: string;
      buttonText: string;
    };

    if (!conversationId || !buttonId || !buttonText) {
      return res.status(400).json({ error: 'conversationId, buttonId, and buttonText are required' });
    }

    insertResponse(conversationId, buttonId, buttonText, 'pending');
    insertMessage(
      conversationId,
      'Customer',
      null,
      null,
      'text_message',
      buttonText,
      null,
      'outbound'
    );
    audit('user_response', conversationId, { buttonId, buttonText });

    // Notify frontend immediately
    io.emit('response_sent', { conversationId, buttonId, buttonText, timestamp: new Date().toISOString() });

    // Update Salesforce async
    const sfResult = await updateConversationResponse(conversationId, buttonId, buttonText);

    const sfStatus = sfResult.success ? 'success' : 'failed';
    updateResponseStatus(conversationId, sfStatus);
    updateConversationStatus(conversationId, 'responded', sfResult.recordId || undefined);

    audit('salesforce_update', conversationId, sfResult);

    io.emit('salesforce_updated', {
      conversationId,
      success: sfResult.success,
      recordId: sfResult.recordId,
      error: sfResult.error,
      salesforceEnabled: isSalesforceEnabled(),
    });

    return res.json({
      status: sfResult.success ? 'success' : 'partial',
      conversationId,
      salesforce: sfResult,
    });
  });

  // POST /api/messages/reset — reset a conversation for demo replay
  router.post('/reset', (req: Request, res: Response) => {
    const { conversationId } = req.body as { conversationId: string };
    if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

    resetConversation(conversationId);
    audit('conversation_reset', conversationId, {});
    io.emit('conversation_reset', { conversationId });

    return res.json({ status: 'reset', conversationId });
  });

  // GET /api/messages/:conversationId
  router.get('/:conversationId', (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const conversation = getConversation(conversationId);
    const messages = getMessages(conversationId);
    return res.json({ conversation, messages });
  });

  // GET /api/messages
  router.get('/', (_req: Request, res: Response) => {
    const conversations = getAllConversations();
    return res.json({ conversations });
  });

  return router;
}
