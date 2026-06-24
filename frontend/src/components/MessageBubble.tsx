import { ChatMessage } from '../types/index.js';

interface Props {
  message: ChatMessage;
  onButtonClick?: (buttonId: string, buttonText: string) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function BlueTicks() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="inline-block ml-1 flex-shrink-0">
      <path d="M11.0156 0.513672L5.01562 6.51367L2.98438 4.48242L1.92188 5.54492L5.01562 8.63867L12.0781 1.57617L11.0156 0.513672Z" fill="#34b7f1"/>
      <path d="M14.0781 0.513672L8.07812 6.51367L7.35937 5.79492L6.29688 6.85742L8.07812 8.63867L15.1406 1.57617L14.0781 0.513672Z" fill="#34b7f1"/>
    </svg>
  );
}

export function MessageBubble({ message, onButtonClick }: Props) {
  const isInbound = message.direction === 'inbound';

  if (!isInbound) {
    return (
      <div className="flex justify-end px-2 mb-1 animate-slide-up">
        <div className="relative max-w-[75%]">
          <div className="absolute -right-[5px] bottom-[6px] w-0 h-0" style={{ borderLeft: '6px solid #dcf8c6', borderTop: '6px solid transparent', borderBottom: '0px solid transparent' }} />
          <div className="rounded-[7.5px] rounded-br-[3px] px-3 py-[6px]" style={{ backgroundColor: '#dcf8c6' }}>
            <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap" style={{ color: '#111' }}>{message.text}</p>
            <div className="flex items-center justify-end gap-0.5 mt-0.5">
              <span className="text-[11px]" style={{ color: '#5a8a6a' }}>{formatTime(message.timestamp)}</span>
              <BlueTicks />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasButtons = message.buttons && message.buttons.length > 0;

  return (
    <div className="flex items-end gap-1.5 px-2 mb-1 animate-slide-up">
      <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 mb-0.5" style={{ backgroundColor: '#128c7e' }}>
        {getInitials(message.contactName)}
      </div>
      <div className="max-w-[80%]">
        <div className="relative">
          <div className="absolute -left-[5px] bottom-[6px] w-0 h-0" style={{ borderRight: '6px solid #fff', borderTop: '6px solid transparent', borderBottom: '0px solid transparent' }} />
          <div className="rounded-[7.5px] rounded-bl-[3px] overflow-hidden" style={{ backgroundColor: '#fff', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
            {message.imageUrl && (
              <img src={message.imageUrl} alt="" className="w-full object-cover block" style={{ maxHeight: 200 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div className="px-3 pt-[6px]" style={{ paddingBottom: 6 }}>
              <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap" style={{ color: '#111' }}>{message.text}</p>
              <div className="flex justify-end mt-1">
                <span className="text-[11px]" style={{ color: '#7a8c8e' }}>{formatTime(message.timestamp)}</span>
              </div>
            </div>
            {hasButtons && (
              <div>
                {message.buttons!.map((btn) => (
                  <div key={btn.id}>
                    <div style={{ height: 1, backgroundColor: '#e0e0e0' }} />
                    <button
                      disabled={message.buttonsDisabled}
                      onClick={() => onButtonClick?.(btn.id, btn.label)}
                      className="w-full flex items-center justify-center gap-1.5 py-[11px] px-3 transition-colors"
                      style={{ backgroundColor: 'transparent', cursor: message.buttonsDisabled ? 'default' : 'pointer' }}
                      onMouseEnter={e => { if (!message.buttonsDisabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f5f5f5'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill={message.buttonsDisabled ? '#aaa' : '#128c7e'} />
                      </svg>
                      <span className="text-[14px] font-normal" style={{ color: message.buttonsDisabled ? '#aaa' : '#128c7e' }}>{btn.label}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
