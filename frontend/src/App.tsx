import { useState } from 'react';
import { useFlowChat } from './hooks/useFlowChat.js';
import { PhoneFrame } from './components/PhoneFrame.js';

export default function App() {
  const { conversation, isTyping, sendResponse, resetConversation } = useFlowChat();
  const [companyName, setCompanyName] = useState('Salesforce');
  const [avatarUrl, setAvatarUrl] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f2f5' }}>
      <PhoneFrame
        conversation={conversation}
        isTyping={isTyping}
        onButtonClick={sendResponse}
        onClearChat={resetConversation}
        companyName={companyName}
        avatarUrl={avatarUrl}
        onCompanyNameChange={setCompanyName}
        onAvatarChange={setAvatarUrl}
      />
    </div>
  );
}
