import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, HelpCircle, Clock, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
import { LazyImage } from "../ui/LazyImage";
import { useBusinessData } from "../../hooks/useBusinessData";

export const HaircutPricing = () => {
  const { services: SERVICES } = useBusinessData();
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Men' | 'Ladies' | 'Kiddies'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLocalService, setActiveLocalService] = useState<string>('');

  useEffect(() => {
    const handleSyncGlobal = (e: any) => {
      const { serviceId } = e.detail || {};
      if (serviceId) {
        setActiveLocalService(serviceId);
      }
    };
    window.addEventListener('select-service', handleSyncGlobal);
    return () => window.removeEventListener('select-service', handleSyncGlobal);
  }, []);

  const categories = [
    { id: 'All', name: 'All' },
    { id: 'Men', name: 'Mens Styles' },
    { id: 'Ladies', name: 'Ladies Styles' },
    { id: 'Kiddies', name: 'Kids Styles' }
  ];

  const filteredServices = SERVICES.filter((s: any) => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectCard = (serviceId: string) => {
    setActiveLocalService(serviceId);
    window.dispatchEvent(new CustomEvent('select-service', { detail: { serviceId } }));
  };

  return (
    <section id="pricing" className="bg-slate-50 text-slate-900 py-20 md:py-32 scroll-mt-10 overflow-hidden relative">
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-brand-blue/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-brand-red/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div
          whileHover={{ y: -4 }}
          className="w-full h-44 md:h-80 relative overflow-hidden rounded-[2rem] md:rounded-[3.2rem] mb-12 md:mb-16 group shadow-2xl shadow-slate-200/50"
        >
          <motion.div
            initial={{ scale: 1.08 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 z-0"
          >
            <LazyImage
              src="https://res.cloudinary.com/dk8jbgjhl/image/upload/q_auto,f_auto/v1777916400/WhatsApp_Image_2026-04-22_at_14.50.03_kwvaiv.jpg"
              alt="Barbershop Background"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
            />
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
          </motion.div>

          <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 md:p-16">
            <span className="text-brand-red font-black uppercase tracking-[0.35em] text-[10px] md:text-sm mb-2 md:mb-3 block">Premium Offerings</span>
            <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-white leading-none">
              SERVICE <span className="text-brand-blue italic font-serif lowercase tracking-normal">MENU</span>
            </h2>
            <p className="text-slate-300 text-[10px] md:text-sm font-medium tracking-wide mt-2 max-w-xl hidden sm:block">
              Select any specialty cut or styling treatment below to immediately load it into your live booking workflow.
            </p>
          </div>
        </motion.div>

        <div className="max-w-6xl mx-auto mb-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-4 py-2.5 rounded-full text-xs font-bold tracking-tight transition-all duration-200 shrink-0 select-none ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Search haircuts, relaxers, treatments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl pl-11 pr-10 py-3 text-xs font-bold focus:outline-none focus:bg-white focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/10 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="popLayout">
            {filteredServices.length > 0 ? (
              <motion.div
                layout
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredServices.map((item: any) => {
                  const isActive = activeLocalService === item.id;
                  const isLadies = item.category === 'Ladies';
                  const isKiddies = item.category === 'Kiddies';

                  const categoryBadgeColor = isLadies
                    ? 'bg-purple-50 text-purple-600 border-purple-200/20'
                    : isKiddies
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200/20'
                    : 'bg-blue-50 text-brand-blue border-blue-200/20';

                  return (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      onClick={() => handleSelectCard(item.id)}
                      className={`relative bg-white rounded-3xl p-6 border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between group ${
                        isActive
                          ? 'border-brand-blue ring-2 ring-brand-blue/10 shadow-2xl shadow-brand-blue/10'
                          : 'border-slate-100 hover:border-slate-200 shadow-lg shadow-slate-100/30'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-red via-brand-blue to-emerald-400"></div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${categoryBadgeColor}`}>
                            {item.category}
                          </span>

                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold font-mono">{item.time}</span>
                          </div>
                        </div>

                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-brand-red transition-colors mb-2.5">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-6 font-medium leading-relaxed">
                          {item.desc || "Standard high-quality specialty hair grooming and design."}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between mt-auto">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Price</span>
                          <span className="text-2xl font-black font-mono text-slate-900">
                            R{item.price}
                          </span>
                        </div>

                        <div className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all ${
                          isActive
                            ? 'bg-brand-blue text-white shadow-md'
                            : 'bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-lg'
                        }`}>
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <>
                              <span>Book Now</span>
                              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-xl">
                <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">No services found</h3>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                  className="mt-6 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Reset filters
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default HaircutPricing;
