import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';

export const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-[100] w-16 h-16 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center shadow-2xl shadow-slate-300 hover:bg-brand-red transition-all group overflow-hidden"
        >
          <img
            src="https://res.cloudinary.com/dggitwduo/image/upload/v1775635697/SB_BARBER_LOGO_ASSET_ag52o1.png"
            alt="Barber"
            className="w-7 h-7 object-contain brightness-0 invert group-hover:rotate-12 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 opacity-60 group-hover:opacity-100 transition-opacity">Top</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};
export default BackToTop;
