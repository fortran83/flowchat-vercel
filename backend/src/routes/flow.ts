import { Router, Request, Response } from 'express';
import { Server as IOServer } from 'socket.io';
import { MessageButton } from '../types/index.js';
import { upsertConversation, insertMessage, insertResponse, updateResponseStatus, audit } from '../services/database.js';
import { registerPending, resolvePending } from '../services/pendingRequests.js';
import { v4 as uuid } from 'uuid';

export function createFlowRouter(io: IOServer): Router {
  const router = Router();

  /**
   * POST /api/flow/send-and-wait
   *
   * Called by the Apex InvocableMethod.
   * - Generates a conversation ID automatically (no caller input needed)
   * - Pushes message to the phone UI via WebSocket
   * - Long-polls: holds the HTTP connection open until the user taps a button
   * - Returns buttonText, buttonId directly in the response
   *
   * Salesforce callout timeout = 120s. We timeout at 114s and return
   * { timedOut: true } so the Flow can handle it gracefully.
   */
  router.post('/send-and-wait', async (req: Request, res: Response) => {
    const body = req.body as {
      messageText: string;
      contactName?: string;
      imageUrl?: string;
      button1Label?: string;
      button2Label?: string;
      button3Label?: string;
      button4Label?: string;
      button5Label?: string;
    };

    if (!body.messageText) {
      return res.status(400).json({ error: 'messageText is required' });
    }

    const conversationId = uuid();
    const contactName = body.contactName?.trim() || 'Customer';
    const messageText = body.messageText.replace(/\\n/g, '\n');

    const buttons: MessageButton[] = [
      body.button1Label,
      body.button2Label,
      body.button3Label,
      body.button4Label,
      body.button5Label,
    ]
      .filter((l): l is string => !!l?.trim())
      .map((label, i) => ({ id: `btn_${i + 1}`, label: label.trim() }));

    const messageType = buttons.length > 0 ? 'button_message' : 'text_message';

    upsertConversation(conversationId, contactName, null, null);
    insertMessage(conversationId, contactName, null, null, messageType, messageText, buttons.length ? JSON.stringify(buttons) : null, 'inbound');
    audit('flow_send_and_wait', conversationId, body);

    io.emit('new_message', {
      conversationId,
      contactName,
      contactId: null,
      campaignId: null,
      message: { type: messageType, text: messageText, imageUrl: body.imageUrl ?? null },
      buttons,
      timestamp: new Date().toISOString(),
    });

    // Hold connection open — resolved by /api/flow/tap when user clicks
    registerPending(conversationId, res, () => {
      audit('flow_timeout', conversationId, {});
      res.json({ buttonText: null, buttonId: null, conversationId, timedOut: true });
    });
  });

  /**
   * POST /api/flow/tap
   * Called by the frontend when the user taps a button.
   * Resolves the pending long-poll for that conversation.
   */
  router.post('/tap', async (req: Request, res: Response) => {
    const { conversationId, buttonId, buttonText } = req.body as {
      conversationId: string;
      buttonId: string;
      buttonText: string;
    };

    if (!conversationId || !buttonId || !buttonText) {
      return res.status(400).json({ error: 'conversationId, buttonId, buttonText required' });
    }

    insertResponse(conversationId, buttonId, buttonText, 'success');
    insertMessage(conversationId, 'Customer', null, null, 'text_message', buttonText, null, 'outbound');
    audit('user_tap', conversationId, { buttonId, buttonText });

    io.emit('response_sent', { conversationId, buttonId, buttonText, timestamp: new Date().toISOString() });
    io.emit('salesforce_updated', { conversationId, success: true, recordId: null, salesforceEnabled: false });

    const resolved = resolvePending(conversationId, buttonId, buttonText);

    updateResponseStatus(conversationId, resolved ? 'success' : 'failed');

    return res.json({ ok: true, resolved });
  });

  return router;
}
