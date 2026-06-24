import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage, ConversationState } from '../types/index.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://flowchat-vercel-production.up.railway.app';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useFlowChat() {
  const socketRef = useRef<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting');
  const [sfEnabled, setSfEnabled] = useState(false);
  const [conversation, setConversation] = useState<ConversationState>({
    conversationId: null,
    contactName: null,
    contactId: null,
    campaignId: null,
    status: 'idle',
    messages: [],
    lastResponse: null,
    sfStatus: 'idle',
    sfRecordId: null,
    sfError: null,
  });
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/status`)
      .then((r) => r.json())
      .then((d) => setSfEnabled(d.salesforceEnabled ?? false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setSocketStatus('connected'));
    socket.on('disconnect', () => setSocketStatus('disconnected'));
    socket.on('connect_error', () => setSocketStatus('disconnected'));

    socket.on('new_message', (data: {
      conversationId: string;
      contactName: string;
      contactId: string;
      campaignId: string;
      message: { type: string; text: string; imageUrl?: string | null };
      buttons: Array<{ id: string; label: string }>;
      timestamp: string;
    }) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const msg: ChatMessage = {
          id: makeId(),
          conversationId: data.conversationId,
          contactName: data.contactName,
          direction: 'inbound',
          text: data.message.text,
          imageUrl: data.message.imageUrl ?? null,
          buttons: data.buttons,
          timestamp: data.timestamp,
          buttonsDisabled: false,
        };
        setConversation((prev) => ({
          ...prev,
          conversationId: data.conversationId,
          contactName: data.contactName,
          contactId: data.contactId,
          campaignId: data.campaignId,
          status: 'waiting',
          messages: [...prev.messages, msg],
          sfStatus: 'idle',
          sfError: null,
        }));
      }, 1400);
    });

    socket.on('response_sent', (data: {
      conversationId: string;
      buttonId: string;
      buttonText: string;
      timestamp: string;
    }) => {
      setConversation((prev) => {
        const messages = prev.messages.map((m) =>
          m.direction === 'inbound' && m.buttons?.length
            ? { ...m, buttonsDisabled: true }
            : m
        );
        const reply: ChatMessage = {
          id: makeId(),
          conversationId: data.conversationId,
          contactName: 'You',
          direction: 'outbound',
          text: data.buttonText,
          timestamp: data.timestamp,
        };
        return {
          ...prev,
          status: 'responded',
          messages: [...messages, reply],
          lastResponse: { buttonId: data.buttonId, buttonText: data.buttonText },
          sfStatus: 'pending',
        };
      });
    });

    socket.on('salesforce_updated', (data: {
      conversationId: string;
      success: boolean;
      recordId: string | null;
      error?: string;
      salesforceEnabled: boolean;
    }) => {
      setConversation((prev) => ({
        ...prev,
        // success = tap was resolved and Apex callout returned buttonText to Flow
        sfStatus: data.success ? 'success' : 'failed',
        sfRecordId: data.recordId,
        sfError: data.error || null,
      }));
    });

    socket.on('conversation_reset', () => {
      setConversation({
        conversationId: null,
        contactName: null,
        contactId: null,
        campaignId: null,
        status: 'idle',
        messages: [],
        lastResponse: null,
        sfStatus: 'idle',
        sfRecordId: null,
        sfError: null,
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  const sendResponse = useCallback(async (buttonId: string, buttonText: string) => {
    if (!conversation.conversationId) return;
    // Always call /api/flow/tap — works for both long-poll (Apex) and legacy flows
    await fetch(`${BACKEND_URL}/api/flow/tap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: conversation.conversationId,
        buttonId,
        buttonText,
      }),
    });
  }, [conversation.conversationId]);

  const resetConversation = useCallback(async () => {
    if (!conversation.conversationId) {
      setConversation({
        conversationId: null,
        contactName: null,
        contactId: null,
        campaignId: null,
        status: 'idle',
        messages: [],
        lastResponse: null,
        sfStatus: 'idle',
        sfRecordId: null,
        sfError: null,
      });
      return;
    }
    await fetch(`${BACKEND_URL}/api/messages/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: conversation.conversationId }),
    });
  }, [conversation.conversationId]);

  return {
    conversation,
    isTyping,
    socketStatus,
    sfEnabled,
    sendResponse,
    resetConversation,
  };
}
