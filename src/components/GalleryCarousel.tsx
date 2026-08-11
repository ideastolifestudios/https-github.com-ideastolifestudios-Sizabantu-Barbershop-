import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface Props {
  images: string[];
  interval?: number;
  onImageClick?: (src: string) => void;
}

const GalleryCarousel: React.FC<Props> = ({ images, interval = 4000, onImageClick }) => {
  const [index, setIndex] = useState(0);
  const mounted = useRef(true);
  const timerRef = useRef<number | null>(null);
  const length = images.length;

  useEffect(() => {
    mounted.current = true;
    startAuto();
    return () => {
      mounted.current = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length]);

  const startAuto = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % Math.max(1, length));
    }, interval);
  };

  const goPrev = () => {
    setIndex((i) => (i - 1 + length) % length);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };
  const goNext = () => {
    setIndex((i) => (i + 1) % length);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="w-full relative rounded-2xl overflow-hidden">
      <div className="relative w-full h-[360px] md:h-[520px]">
        {images.map((src, i) => (
          <motion.img
            key={i}
            src={src}
            alt={`gallery-${i}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={i === index ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 w-full h-full object-cover"
            onClick={() => onImageClick && onImageClick(src)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>

      {/* Arrows */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <button
          onClick={goPrev}
          className="pointer-events-auto bg-white/90 p-3 rounded-full shadow-md hover:bg-white transition-all"
          aria-label="Previous"
        >
          ‹
        </button>
        <button
          onClick={goNext}
          className="pointer-events-auto bg-white/90 p-3 rounded-full shadow-md hover:bg-white transition-all"
          aria-label="Next"
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIndex(i); if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } }}
            className={`w-3 h-3 rounded-full transition-all ${i === index ? 'bg-white' : 'bg-white/40'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default GalleryCarousel;
