"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right";
  width?: string;
}

export default function SideDrawer({
  isOpen, onClose, children,
  side = "right", width = "w-80",
}: SideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── Lock body scroll when drawer is open ──────────────────
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflowY = "scroll";
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflowY = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // ── Escape key to close ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Auto-focus drawer when it opens ───────────────────────
  useEffect(() => {
    if (isOpen) drawerRef.current?.focus();
  }, [isOpen]);

  const slideFrom = side === "right" ? { x: "100%" } : { x: "-100%" };
  const position = side === "right" ? "right-0" : "left-0";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Portal-level overlay — z-[9999] beats everything ── */}
          {/* FIX: fixed + inset-0 + 100dvh covers full viewport on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[2px]"
            style={{ minHeight: "100dvh" }}
            aria-hidden="true"
          >
            {/* ── Drawer panel ── */}
            {/* FIX: absolute + top-0 + h-full fills the fixed overlay perfectly */}
            <motion.div
              ref={drawerRef}
              initial={slideFrom}
              animate={{ x: 0 }}
              exit={slideFrom}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className={`absolute top-0 ${position} h-full ${width}
                bg-[#141414] border-${side === "right" ? "l" : "r"} border-[#C9A84C]/15
                flex flex-col overflow-y-auto shadow-[-8px_0_40px_rgba(0,0,0,0.5)]
                focus:outline-none`}
            >
              {/* Close button */}
              <div className="flex items-center justify-between p-5 border-b border-[#C9A84C]/10">
                <span className="text-[0.65rem] text-[#C9A84C] tracking-[0.15em] uppercase font-medium">
                  Menu
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center border border-[#C9A84C]/15
                    text-white/40 hover:text-[#C9A84C] hover:border-[#C9A84C]/40 transition-all"
                  aria-label="Close menu"
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              </div>

              {/* Drawer content */}
              <div className="flex-1 p-6">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
