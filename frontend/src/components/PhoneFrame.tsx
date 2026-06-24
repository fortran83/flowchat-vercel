import { useRef, useEffect, useState } from 'react';
import { ConversationState } from '../types/index.js';
import { MessageBubble } from './MessageBubble.js';
import { TypingIndicator } from './TypingIndicator.js';

interface Props {
  conversation: ConversationState;
  isTyping: boolean;
  onButtonClick: (buttonId: string, buttonText: string) => void;
  onClearChat: () => void;
  companyName: string;
  avatarUrl: string;
  onCompanyNameChange: (name: string) => void;
  onAvatarChange: (url: string) => void;
}

function useClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(t);
  }, []);
  return time;
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function SettingsMenu({
  companyName, avatarUrl, onCompanyNameChange, onAvatarChange, onClose,
}: {
  companyName: string; avatarUrl: string;
  onCompanyNameChange: (v: string) => void; onAvatarChange: (v: string) => void; onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') { onAvatarChange(result); onClose(); }
    };
    reader.readAsDataURL(file);
  }

  function applyUrl() {
    if (urlInput.trim()) { onAvatarChange(urlInput.trim()); setUrlInput(''); onClose(); }
  }

  return (
    <div
      className="absolute right-0 top-[calc(100%+4px)] rounded-lg overflow-hidden z-50 flex flex-col"
      style={{ backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.22)', width: 230 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 pt-3 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#075e54' }}>Chat Profile</p>
      </div>
      <div className="px-4 py-2 flex items-center gap-3">
        <div
          className="w-[46px] h-[46px] rounded-full overflow-hidden flex items-center justify-center text-white text-[15px] font-semibold cursor-pointer flex-shrink-0"
          style={{ backgroundColor: '#128c7e' }}
          onClick={() => fileInputRef.current?.click()}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : getInitials(companyName) || '?'}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <button onClick={() => fileInputRef.current?.click()} className="text-left text-[12px] py-1 px-2 rounded-md" style={{ color: '#128c7e', backgroundColor: '#f0faf8' }}>Upload photo</button>
          <button onClick={() => setUrlMode((v) => !v)} className="text-left text-[12px] py-1 px-2 rounded-md" style={{ color: '#128c7e', backgroundColor: '#f0faf8' }}>{urlMode ? 'Cancel' : 'Paste URL'}</button>
          {avatarUrl && <button onClick={() => { onAvatarChange(''); onClose(); }} className="text-left text-[12px] py-1 px-2 rounded-md" style={{ color: '#c0392b', backgroundColor: '#fdf0f0' }}>Remove photo</button>}
        </div>
      </div>
      {urlMode && (
        <div className="px-4 pb-2 flex gap-2">
          <input type="text" autoFocus placeholder="https://..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyUrl()} className="flex-1 text-[12px] px-2 py-1.5 rounded border outline-none" style={{ borderColor: '#ddd', color: '#111' }} />
          <button onClick={applyUrl} className="text-[12px] px-3 py-1.5 rounded text-white" style={{ backgroundColor: '#075e54' }}>Set</button>
        </div>
      )}
      <div style={{ height: 1, backgroundColor: '#f0f0f0', margin: '4px 0' }} />
      <div className="px-4 py-2 flex flex-col gap-1">
        <p className="text-[11px]" style={{ color: '#888' }}>Contact display name</p>
        <input type="text" value={companyName} onChange={(e) => onCompanyNameChange(e.target.value)} placeholder="e.g. Salesforce" className="text-[13px] px-2 py-1.5 rounded border outline-none" style={{ borderColor: '#ddd', color: '#111' }} />
      </div>
      <button onClick={onClose} className="mx-4 mb-3 mt-1 py-1.5 rounded-lg text-[13px] font-medium text-white" style={{ backgroundColor: '#075e54' }}>Done</button>
    </div>
  );
}

function StatusBar({ time }: { time: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[13px] font-semibold relative" style={{ color: '#fff', backgroundColor: '#075e54' }}>
      <span>{time}</span>
      <div className="absolute left-1/2 -translate-x-1/2 top-1 w-[95px] h-[25px] rounded-full" style={{ backgroundColor: '#000' }} />
      <div className="flex items-center gap-[6px]">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff"><rect x="0" y="4" width="3" height="8" rx="0.5"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13.5" y="0" width="3" height="12" rx="0.5" opacity="0.45"/></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="#fff"><path d="M8 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/><path d="M8 6.5C6.3 6.5 4.8 7.2 3.7 8.3l1.4 1.4C6 8.8 6.9 8.5 8 8.5s2 .3 2.9 1.2l1.4-1.4C11.2 7.2 9.7 6.5 8 6.5z"/><path d="M8 3.5C5.4 3.5 3.1 4.6 1.5 6.3l1.4 1.4C4.2 6.3 6 5.5 8 5.5s3.8.8 5.1 2.2l1.4-1.4C12.9 4.6 10.6 3.5 8 3.5z" opacity="0.6"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#fff" strokeOpacity="0.5" strokeWidth="1"/><rect x="1.5" y="1.5" width="18" height="9" rx="2.5" fill="#fff"/><path d="M23 4v4a2.5 2.5 0 000-4z" fill="#fff" opacity="0.4"/></svg>
      </div>
    </div>
  );
}

function WaHeader({ companyName, avatarUrl, onCompanyNameChange, onAvatarChange }: { companyName: string; avatarUrl: string; onCompanyNameChange: (v: string) => void; onAvatarChange: (v: string) => void; }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = getInitials(companyName);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-2 px-2 py-2 relative" style={{ backgroundColor: '#075e54' }}>
      <button className="p-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
        <svg width="10" height="17" viewBox="0 0 10 17" fill="currentColor"><path d="M8.5 1L1.5 8.5L8.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
      </button>
      <div className="w-[38px] h-[38px] rounded-full flex-shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-[13px] font-semibold" style={{ backgroundColor: '#128c7e' }}>
            {initials || <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold leading-tight truncate text-white">{companyName}</p>
        <p className="text-[12px] leading-tight" style={{ color: 'rgba(255,255,255,0.7)' }}>online</p>
      </div>
      <div className="flex items-center gap-4 pr-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
        <button><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg></button>
        <button><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></button>
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}>
            <svg width="4" height="18" viewBox="0 0 4 18" fill="currentColor"><circle cx="2" cy="2" r="2"/><circle cx="2" cy="9" r="2"/><circle cx="2" cy="16" r="2"/></svg>
          </button>
          {menuOpen && <SettingsMenu companyName={companyName} avatarUrl={avatarUrl} onCompanyNameChange={onCompanyNameChange} onAvatarChange={onAvatarChange} onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
    </div>
  );
}

function WaWallpaper() {
  return (
    <div className="absolute inset-0" style={{ backgroundColor: '#e5ddd5', backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c8bfb4' fill-opacity='0.35' fill-rule='evenodd'%3E%3Ccircle cx='12' cy='12' r='2'/%3E%3Ccircle cx='36' cy='36' r='2'/%3E%3Ccircle cx='12' cy='48' r='1.5'/%3E%3Ccircle cx='48' cy='12' r='1.5'/%3E%3C/g%3E%3C/svg%3E")` }} />
  );
}

function DateChip({ onDoubleClick }: { onDoubleClick: () => void }) {
  const today = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
  return (
    <div className="flex justify-center my-3 relative z-10" onDoubleClick={onDoubleClick} style={{ cursor: 'default' }}>
      <span className="text-[11.5px] px-3 py-[3px] rounded-[7px]" style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: '#7a8c8e', userSelect: 'none' }}>{today}</span>
    </div>
  );
}

function EncryptionNotice() {
  return (
    <div className="flex justify-center mb-3 px-6 relative z-10">
      <div className="text-center text-[11.5px] px-3 py-2 rounded-[7px] leading-snug" style={{ backgroundColor: 'rgba(255,251,213,0.9)', color: '#7a8c8e', maxWidth: 260 }}>
        🔒 Messages are end-to-end encrypted. No one outside of this chat can read or listen to them.
      </div>
    </div>
  );
}

function WaInputBar() {
  return (
    <div className="flex items-center gap-[6px] px-2 py-[7px]" style={{ backgroundColor: '#f0f2f0' }}>
      <button className="flex-shrink-0 p-1" style={{ color: '#8696a0' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      </button>
      <div className="flex-1 rounded-full bg-white" style={{ minHeight: 42 }} />
      <button className="flex-shrink-0 p-1" style={{ color: '#8696a0' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
      </button>
      <button className="flex-shrink-0 p-1" style={{ color: '#8696a0' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
      </button>
    </div>
  );
}

export function PhoneFrame({ conversation, isTyping, onButtonClick, onClearChat, companyName, avatarUrl, onCompanyNameChange, onAvatarChange }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const time = useClock();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages, isTyping]);

  return (
    <div className="relative" style={{ width: 370, height: 760 }}>
      <div className="absolute inset-0 rounded-[50px]" style={{ background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 50px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)' }} />
      <div className="absolute -left-[3px] top-[110px] w-[3px] h-[34px] rounded-l-sm" style={{ backgroundColor: '#3a3a3a' }} />
      <div className="absolute -left-[3px] top-[158px] w-[3px] h-[60px] rounded-l-sm" style={{ backgroundColor: '#3a3a3a' }} />
      <div className="absolute -left-[3px] top-[230px] w-[3px] h-[60px] rounded-l-sm" style={{ backgroundColor: '#3a3a3a' }} />
      <div className="absolute -right-[3px] top-[180px] w-[3px] h-[80px] rounded-r-sm" style={{ backgroundColor: '#3a3a3a' }} />
      <div className="absolute rounded-[44px] overflow-hidden flex flex-col" style={{ inset: 7, backgroundColor: '#e5ddd5' }}>
        <StatusBar time={time} />
        <WaHeader companyName={companyName} avatarUrl={avatarUrl} onCompanyNameChange={onCompanyNameChange} onAvatarChange={onAvatarChange} />
        <div className="relative flex flex-col flex-1 min-h-0">
          <WaWallpaper />
          <div className="relative z-10 flex-1 overflow-y-auto pt-1 pb-2" style={{ scrollbarWidth: 'none' }}>
            <DateChip onDoubleClick={onClearChat} />
            <EncryptionNotice />
            {conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onButtonClick={onButtonClick} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} className="h-2" />
          </div>
          <div className="relative z-10 flex-shrink-0">
            <WaInputBar />
            <div className="flex justify-center pb-2 pt-1" style={{ backgroundColor: '#f0f2f0' }}>
              <div className="w-[120px] h-[4px] rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
