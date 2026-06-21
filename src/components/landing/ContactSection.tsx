import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, Mail, Instagram, MessageSquare, Clock, Send, ExternalLink, CheckCircle2 } from 'lucide-react';

export const ContactSection = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<any>({});
  const [isSent, setIsSent] = useState(false);

  const validate = () => {
    const newErrors: any = {};
    if (!formData.name) newErrors.name = "Required";
    if (!formData.email) newErrors.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email";
    if (!formData.message) newErrors.message = "Required";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSent(true);
    setTimeout(() => setIsSent(false), 3000);
  };

  return (
    <section id="contact" className="py-32 bg-white text-slate-900 relative overflow-hidden scroll-mt-20">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-blue/5 -skew-x-12 translate-x-1/4 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-24 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px] mb-6 block">Contact Us</span>
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-16">
              Get <br /> <span className="text-brand-blue italic font-serif lowercase tracking-normal">In Touch</span>
            </h2>

            <div className="grid gap-12">
              <div className="flex items-start gap-6 group cursor-default">
                <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl group-hover:bg-brand-red group-hover:text-white transition-all duration-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Call Us</p>
                  <p className="text-2xl md:text-3xl font-black tracking-tight">+27 60 724 6829</p>
                </div>
              </div>

              <div className="flex items-start gap-6 group cursor-default">
                <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl group-hover:bg-brand-blue group-hover:text-white transition-all duration-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Visit Us</p>
                  <p className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                    Klipfontein view 644 <br /> Nancy Ndamase street
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6 group cursor-default">
                <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Electronic Mail</p>
                  <p className="text-2xl md:text-3xl font-black tracking-tight">sizabantubarbershop@gmail.com</p>
                </div>
              </div>
            </div>

            <div className="mt-20 flex gap-6">
              <a href="https://www.instagram.com/sizabantub/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-slate-100 flex items-center justify-center rounded-full text-slate-400 hover:bg-brand-red hover:text-white hover:border-brand-red transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://wa.me/27607246829" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-slate-100 flex items-center justify-center rounded-full text-slate-400 hover:bg-brand-blue hover:text-white hover:border-brand-blue transition-all">
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            {/* Fixed Google Map - Precise Location */}
            <div className="rounded-[3rem] overflow-hidden h-[450px] border border-slate-200 shadow-2xl relative group">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3584.0531518388435!2d28.127814476081078!3d-26.01524317719602!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1e9513364f3d2f95%3A0x678663806f339b1a!2sSizabantu%20Barbershop!5e0!3m2!1sen!2sza!4v1713697200000!5m2!1sen!2sza"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                title="Sizabantu Barbershop Location"
                className="grayscale hover:grayscale-0 transition-all duration-1000"
              ></iframe>
            </div>

            <div className="p-12 glass rounded-[3rem] border border-slate-200 shadow-2xl relative overflow-hidden">
               <AnimatePresence>
                {isSent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-brand-blue/90 backdrop-blur-md z-50 flex items-center justify-center p-8 text-center"
                  >
                    <div className="text-white">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Message Sent</h3>
                      <p className="text-white/60 font-serif italic">We'll get back to you shortly.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-red mb-10">Direct Message</h4>
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</label>
                       {errors.name && <span className="text-[8px] text-brand-red font-black uppercase">{errors.name}</span>}
                    </div>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full bg-white border ${errors.name ? 'border-brand-red' : 'border-slate-200'} rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-blue transition-all font-bold text-sm`}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</label>
                       {errors.email && <span className="text-[8px] text-brand-red font-black uppercase">{errors.email}</span>}
                    </div>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className={`w-full bg-white border ${errors.email ? 'border-brand-red' : 'border-slate-200'} rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-blue transition-all font-bold text-sm`}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</label>
                     {errors.message && <span className="text-[8px] text-brand-red font-black uppercase">{errors.message}</span>}
                  </div>
                  <textarea
                    placeholder="Tell us about your dream cut..."
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className={`w-full bg-white border ${errors.message ? 'border-brand-red' : 'border-slate-200'} rounded-2xl px-6 py-4 focus:outline-none focus:border-brand-blue transition-all resize-none font-bold text-sm`}
                  ></textarea>
                </div>
                <button type="submit" className="w-full bg-brand-red text-white hover:bg-brand-dark py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-4">
                  Send Message
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
