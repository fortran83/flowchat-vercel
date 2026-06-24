export function TypingIndicator() {
  return (
    <div className="flex items-end gap-1.5 px-2 mb-1 animate-fade-in">
      <div className="w-[30px] h-[30px] rounded-full flex-shrink-0" style={{ backgroundColor: '#128c7e' }} />
      <div className="rounded-[7.5px] rounded-bl-[3px] px-4 py-3 flex gap-[5px] items-center" style={{ backgroundColor: '#fff', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
        {[0, 200, 400].map((delay) => (
          <span key={delay} className="w-[7px] h-[7px] rounded-full animate-pulse-dot" style={{ backgroundColor: '#aaa', animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );
}
