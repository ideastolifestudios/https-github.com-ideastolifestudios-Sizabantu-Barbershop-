import React from 'react';
import { Scissors, Instagram, MessageSquare, MapPin, Phone, Mail, ChevronRight, ArrowRight } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-50 text-slate-900 pt-24 pb-12 relative border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <img
              src="https://res.cloudinary.com/dggitwduo/image/upload/v1775631839/SB_BARBER_LOGO_evz0fu.png"
              alt="Sizabantu Barbershop"
              className="h-16 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="text-slate-500 text-sm leading-relaxed">
              Established in 2022, Sizabantu Barbershop is dedicated to providing the ultimate grooming experience.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/sizabantub/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-brand-red transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://wa.me/27607246829" target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-brand-blue transition-all">
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] mb-8">Quick Navigation</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li><a href="#pricing" className="hover:text-brand-blue flex items-center gap-2 group transition-all"><ChevronRight className="w-3 h-3 text-brand-red opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /> Pricing</a></li>
              <li><a href="#portfolio" className="hover:text-brand-blue flex items-center gap-2 group transition-all"><ChevronRight className="w-3 h-3 text-brand-red opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /> Portfolio</a></li>
              <li><a href="#reviews" className="hover:text-brand-blue flex items-center gap-2 group transition-all"><ChevronRight className="w-3 h-3 text-brand-red opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /> Reviews</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] mb-8">Contact Information</h4>
            <ul className="space-y-4 text-slate-500 text-sm">
              <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-brand-red" /> +27 60 724 6829</li>
              <li className="flex items-center gap-3"><Mail className="w-4 h-4 text-brand-red" /> sizabantubarbershop@gmail.com</li>
              <li className="flex items-center gap-3"><MapPin className="w-4 h-4 text-brand-red" /> Klipfontein View, Midrand</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black uppercase tracking-widest text-[10px] mb-8">Community</h4>
            <p className="text-slate-400 text-xs mb-6">Join our barber community for updates and tips.</p>
            <a
              href="https://wa.me/27607246829"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-red text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-brand-dark transition-all flex items-center justify-between group shadow-xl shadow-red-50"
            >
              Join WhatsApp Community
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        <div className="pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] text-slate-400 uppercase tracking-widest font-normal">
          <p className="text-center">&copy; 2026 Sizabantu Barbershop. Crafted for perfection.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-brand-blue">Privacy</a>
            <a href="#" className="hover:text-brand-blue">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- Email Verification Prompt Component ---
export default Footer;
