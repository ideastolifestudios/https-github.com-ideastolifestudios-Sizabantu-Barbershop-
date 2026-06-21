import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Scissors, LogOut, User, LayoutDashboard, Calendar, Search, ArrowRight, Instagram, MessageSquare } from 'lucide-react';
import { LiveStatus } from '../ui/LiveStatus';
import { useAuth } from '../../hooks/useAuth';

export const TopNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, logout } = useAuth();

  const navLinks = [
    { name: 'Book Session', href: '#book' },
    { name: 'Services', href: '#pricing' },
    { name: 'Gallery', href: '#portfolio' },
    { name: 'Reviews', href: '#reviews' },
  ];

  const handleLoginClick = () => {
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] bg-white/80 backdrop-blur-md py-4 border-b border-slate-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <div
          className="flex items-center cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img
            src="https://res.cloudinary.com/dggitwduo/image/upload/v1775631839/SB_BARBER_LOGO_evz0fu.png"
            alt="Sizabantu Barbershop"
            className="h-10 md:h-12 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-brand-red transition-all"
            >
              {link.name}
            </a>
          ))}

          {profile?.role === 'admin' && (
            <a href="#admin-hub" className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue animate-pulse">Admin Hub</a>
          )}

          <div className="h-4 w-px bg-slate-200"></div>

          {profile ? (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">{profile.displayName?.split(' ')[0]}</span>
                </div>
                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-brand-red">{profile.stamps || 0}/10 Stamps</span>
              </div>
              <button onClick={logout} className="p-2.5 bg-slate-50 text-slate-400 hover:text-brand-red hover:bg-brand-red/5 rounded-2xl transition-all">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <motion.button
              onClick={handleLoginClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-200/50 transition-all flex items-center gap-2 group"
            >
              <User className="w-3 h-3 group-hover:rotate-12 transition-transform" />
              Member Login
            </motion.button>
          )}
        </div>

        {/* Mobile Header Elements */}
        <div className="flex md:hidden items-center gap-2">
          {profile ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-tight text-slate-900 leading-none">{profile.displayName?.split(' ')[0]}</span>
                <span className="text-[7px] font-black text-brand-red leading-none mt-0.5">{profile.stamps || 0} Stamps</span>
              </div>
              <button
                onClick={() => setIsOpen(true)}
                className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center transition-all active:scale-95"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleLoginClick} className="w-10 h-10 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center border border-slate-100 active:scale-95">
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(true)}
                className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center transition-all active:scale-95"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[120]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
              className="absolute top-0 right-0 h-full w-4/5 max-w-sm bg-white shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.3)] p-8 flex flex-col pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-16 px-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red">Express</span>
                  <span className="text-2xl font-black uppercase tracking-tighter text-slate-900">Navigation</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors">
                  <X className="w-5 h-5 text-slate-900" />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    onClick={() => setIsOpen(false)}
                    className="text-3xl font-black uppercase tracking-tighter flex justify-between items-center group py-2"
                  >
                    <span>{link.name}</span>
                    <ArrowRight className="w-6 h-6 text-brand-red opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </motion.a>
                ))}
              </div>

              {profile && (
                 <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => { logout(); setIsOpen(false); }}
                  className="mt-8 flex items-center gap-3 w-full p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-brand-red/5 hover:text-brand-red transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Account
                </motion.button>
              )}

              <div className="mt-auto pt-10 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 text-center md:text-left">Let's Connect</p>
                <div className="flex justify-center md:justify-start gap-8">
                  <a href="https://www.instagram.com/sizabantub/" className="group flex flex-col items-center gap-2">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl group-hover:bg-brand-red transition-all">
                      <Instagram className="w-6 h-6" />
                    </div>
                  </a>
                  <a href="https://wa.me/27607246829" className="group flex flex-col items-center gap-2">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl group-hover:bg-brand-blue transition-all">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default TopNav;
