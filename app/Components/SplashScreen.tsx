"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Hide splash screen after 1.8 seconds to keep it snappy but impactful
    const timer = setTimeout(() => {
      setShow(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d1b2a]"
        >
          {/* Subtle background glow effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-orange-500/10 blur-[80px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full bg-emerald-500/10 blur-[60px]" />
          </div>

          <div className="relative flex flex-col items-center">
            {/* Logo container with scale and pulse animations */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden shadow-2xl border border-white/10 glass"
            >
              <Image
                src="/icon-512.png"
                alt="Scory Logo"
                fill
                priority
                sizes="(max-width: 768px) 112px, 128px"
                className="object-cover p-1"
              />
            </motion.div>

            {/* Glowing Ring around logo */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1.15, opacity: [0, 0.3, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut"
              }}
              className="absolute -inset-2 rounded-[32px] border border-orange-500/30 blur-[2px] pointer-events-none"
            />

            {/* Text logo */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-6 text-3xl md:text-4xl font-extrabold tracking-[0.2em] text-white uppercase font-sans"
            >
              SC<span className="text-orange-500">O</span>RY
            </motion.h1>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 0.6 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-2 text-xs md:text-sm text-lavender-grey tracking-wider font-medium"
            >
              Live Cricket Scores & Analytics
            </motion.p>

            {/* Loading Indicator */}
            <div className="mt-8 w-28 h-[3px] bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: "easeInOut"
                }}
                className="w-full h-full bg-gradient-to-r from-orange-500 to-emerald-500"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
