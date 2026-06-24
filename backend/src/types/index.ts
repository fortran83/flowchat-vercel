export interface MessageButton {
  id: string;
  label: string;
}

export interface IncomingMessage {
  conversationId: string;
  contactName: string;
  contactId?: string;
  campaignId?: string;
  message: {
    type: 'button_message' | 'text_message';
    text: string;
    imageUrl?: string;
  };
  buttons?: MessageButton[];
}

export interface FlowSendMessageRequest {
  conversationId: string;
  contactName: string;
  contactId?: string;
  campaignId?: string;
  messageText: string;
  imageUrl?: string;
  button1Label?: string;
  button2Label?: string;
  button3Label?: string;
  button4Label?: string;
  button5Label?: string;
}

export interface FlowSendMessageResponse {
  status: string;
  conversationId: string;
  buttonCount: number;
}

export interface StoredMessage {
  id: number;
  conversation_id: string;
  contact_name: string;
  contact_id: string | null;
  campaign_id: string | null;
  message_type: string;
  message_text: string;
  buttons_json: string | null;
  direction: 'inbound' | 'outbound';
  created_at: string;
}

export interface StoredConversation {
  id: number;
  conversation_id: string;
  contact_name: string;
  contact_id: string | null;
  campaign_id: string | null;
  status: 'waiting' | 'responded' | 'closed';
  sf_record_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoredResponse {
  id: number;
  conversation_id: string;
  button_id: string;
  button_text: string;
  sf_update_status: 'pending' | 'success' | 'failed' | 'skipped';
  created_at: string;
}

export interface SalesforceConfig {
  enabled: boolean;
  loginUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  securityToken: string;
  objectApiName: string;
}
