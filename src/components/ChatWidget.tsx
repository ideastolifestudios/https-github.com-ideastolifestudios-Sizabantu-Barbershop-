import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Howzit! 👋 I'm Sizwe, your AI shop assistant. Ask me anything about opening hours, bookings, services, or prices!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, userId: 'storefront-visitor' })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to get a response.');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: "Eish! 🙈 I'm having a little trouble connecting to the shop server right now. Give me a few seconds and try asking again!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* 1. The Chat Window (Only visible when isOpen is true) */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden flex flex-col h-[450px] transition-all duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-4 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Sizwe | AI Manager</h3>
                <p className="text-[10px] text-amber-100">Sizabantu Barbershop</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition focus:outline-none"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-950/50">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-amber-600 text-white rounded-br-none' 
                      : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-none whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-center space-x-1 text-xs text-gray-400 bg-gray-800/80 border border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 w-fit">
                <span>Sizwe is typing</span>
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-gray-900 border-t border-gray-800 flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about cuts, times, bookings..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-xl transition shadow-md flex items-center justify-center"
              aria-label="Send message"
            >
              <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>

        </div>
      )}

      {/* 2. The Floating Action Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-auto flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white shadow-lg hover:shadow-amber-500/30 hover:scale-105 transition-all duration-200 focus:outline-none"
        aria-label="Toggle AI Shop Assistant"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

    </div>
  );
};

export default ChatWidget;
