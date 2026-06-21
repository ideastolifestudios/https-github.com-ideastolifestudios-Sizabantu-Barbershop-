import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X, ChevronRight, Star, Heart, ShieldCheck, Trophy, Scissors } from "lucide-react";

export const WelcomeJourney = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) {
      setEmailError('Invalid email');
      return;
    }
    setEmailError('');
    setSubscribed(true);
  };

  return (
    <section className="py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-slate-900 rounded-[4rem] p-12 md:p-24 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-16">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-[url('https://res.cloudinary.com/dk8jbgjhl/image/upload/q_auto/f_auto/v1777916400/WhatsApp_Image_2026-04-22_at_14.50.02_bgba6b.jpg')] bg-cover opacity-20 hidden md:block"></div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-transparent to-slate-900 z-10 hidden md:block"></div>

          <div className="relative z-20 max-w-xl">
            <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-8 block">Exclusive Entry</span>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.85] mb-8">
              Join The <br /> <span className="text-brand-blue italic font-serif lowercase tracking-normal">Inner Circle</span>
            </h2>
            <p className="text-white/40 text-sm md:text-lg mb-12 leading-relaxed font-serif italic">
              New customers get an automated 20% discount code on their first session. Join our newsletter to receive grooming guides and priority slot alerts.
            </p>

            {subscribed ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 bg-brand-red rounded-3xl text-white text-center relative overflow-hidden">
                <motion.div
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-white"
                />
                <div className="relative z-10">
                  <p className="font-black uppercase tracking-widest text-xs mb-2">Check Your Inbox!</p>
                  <p className="text-sm font-bold opacity-80 italic font-serif">Welcome to the Sizabantu family.</p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="your@email.com"
                    required
                    className={`w-full bg-white/5 border ${emailError ? 'border-brand-red' : 'border-white/10'} px-8 py-5 rounded-2xl text-white font-bold outline-none focus:border-brand-blue transition-all`}
                  />
                  {emailError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -bottom-6 left-4 text-[10px] text-brand-red font-black uppercase tracking-widest">{emailError}</motion.p>
                  )}
                </div>
                <button type="submit" className="bg-white text-slate-900 px-6 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[8px] hover:bg-brand-red hover:text-white transition-all shadow-xl relative overflow-hidden shrink-0 h-fit">
                  <span className="relative z-10">Sign Me Up</span>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-full -left-full w-[300%] h-[300%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(59,130,246,0.1)_360deg)]"
                  />
                </button>
              </form>
            )}
          </div>

          <div className="relative z-20 flex-shrink-0">
             <motion.div
              animate={{ rotate: 6 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              className="w-56 h-56 bg-brand-red rounded-[3rem] border-8 border-white/10 shadow-2xl overflow-hidden"
             >
                <img src="https://res.cloudinary.com/dk8jbgjhl/image/upload/q_auto/f_auto/v1777916400/WhatsApp_Image_2026-04-22_at_14.24.26_oeviud.jpg" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" alt="Welcome" />
             </motion.div>
             <motion.div
              animate={{
                rotate: [-12, -8, -12],
                y: [0, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -left-4 w-24 h-24 bg-brand-blue rounded-3xl border-4 border-slate-900 flex items-center justify-center p-4 shadow-xl"
             >
                <Scissors className="w-10 h-10 text-white" />
             </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default WelcomeJourney;
