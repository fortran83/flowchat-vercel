export interface MessageButton {
  id: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  contactName: string;
  direction: 'inbound' | 'outbound';
  text: string;
  imageUrl?: string | null;
  buttons?: MessageButton[];
  timestamp: string;
  buttonsDisabled?: boolean;
}

export interface ConversationState {
  conversationId: string | null;
  contactName: string | null;
  contactId: string | null;
  campaignId: string | null;
  status: 'idle' | 'waiting' | 'responded';
  messages: ChatMessage[];
  lastResponse: { buttonId: string; buttonText: string } | null;
  sfStatus: 'idle' | 'pending' | 'success' | 'failed' | 'disabled';
  sfRecordId: string | null;
  sfError: string | null;
}
