import React, { useState, useEffect } from 'react';

export const LiveStatus = ({ centered = false }: { centered?: boolean }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOpen = () => {
    const day = time.getDay(); // 0 = Sunday, 1 = Monday, ...
    const hour = time.getHours();

    if (day === 1) return false; // Monday Closed
    return hour >= 9 && hour < 18; // 09:00 - 18:00
  };

  if (centered) {
    return (
      <div className="flex flex-col items-center justify-center mt-16 text-center">
        <div className="flex items-center gap-2 mb-2 bg-slate-950/45 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
          <span className={`relative flex h-2 w-2 ${isOpen() ? 'text-emerald-500' : 'text-brand-red'}`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen() ? 'bg-emerald-400' : 'bg-brand-red/40'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOpen() ? 'bg-emerald-500' : 'bg-brand-red'}`}></span>
          </span>
          <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isOpen() ? 'text-emerald-500 font-bold' : 'text-brand-red font-bold'}`}>
            {isOpen() ? 'Open Now' : 'Closed Now'}
          </p>
        </div>
        <p className="text-3xl md:text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">
          {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>

        {/* Operating Hours info nicely aligned */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-[9px] text-white/30 tracking-[0.2em] uppercase font-bold bg-slate-950/10 px-4 py-2 rounded-lg border border-white/5">
          <span>TUE - SUN: 09:00 - 18:00</span>
          <span className="hidden sm:inline text-white/10">•</span>
          <span className="text-brand-red/80">MON: CLOSED</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-10 right-10 text-right">
      <div className="flex items-center justify-end gap-3 mb-1">
        <span className={`relative flex h-2 w-2 ${isOpen() ? 'text-emerald-500' : 'text-brand-red'}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen() ? 'bg-emerald-400' : 'bg-brand-red/40'}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isOpen() ? 'bg-emerald-500' : 'bg-brand-red'}`}></span>
        </span>
        <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isOpen() ? 'text-emerald-500' : 'text-brand-red'}`}>
          {isOpen() ? 'Open Now' : 'Closed Now'}
        </p>
      </div>
      <p className="text-2xl font-black text-white tracking-tighter tabular-nums">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </p>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">
        {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
};
export default LiveStatus;
