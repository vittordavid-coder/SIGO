import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ExcavatorLoaderProps {
  isSaving: boolean;
  message?: string;
}

export function ExcavatorLoader({ isSaving, message = "Gravando dados..." }: ExcavatorLoaderProps) {
  useEffect(() => {
    if (!isSaving) return;

    // Prevent page reload or closing
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      const alertMsg = "A importação está sendo gravada no banco de dados. Por favor, aguarde para evitar perda de dados.";
      e.returnValue = alertMsg;
      return alertMsg;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSaving]);

  if (!isSaving) return null;

  return (
    <AnimatePresence>
      {/* Blurr overlay to prevent clicks while saving but allow seeing the underlying screen */}
      <motion.div
        id="excavator-loader-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[99999] flex flex-col items-center justify-center select-none cursor-wait"
      >
        {/* Central visual feedback card to make it look extremely premium */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm text-center flex flex-col items-center gap-4"
        >
          {/* Main static excavator animation in center of card */}
          <div className="w-48 h-32 relative bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/50 rounded-xl overflow-hidden flex items-center justify-center p-2">
            <ExcavatorAnimation />
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
              {message}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[260px] leading-relaxed">
              Por favor, não saia, recarregue ou feche a página. Estamos sincronizando tudo com segurança no Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 animate-pulse">
              Salvando em lote
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Custom Excavator & Dump Truck animation inside SVG with Framer Motion.
 */
function ExcavatorAnimation({ miniature = false }: { miniature?: boolean }) {
  const scale = miniature ? 0.5 : 1;

  // Animation cycle definitions for boom, stick, bucket and soil
  // 0s to 1s: scooping down left
  // 1s to 2s: lifting and swinging to the right
  // 2s to 2.4s: dumping into truck
  // 2.4s to 3s: swinging back left

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ transform: `scale(${scale})` }}
    >
      <svg
        width="200"
        height="120"
        viewBox="0 0 200 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* GROUND LINE */}
        <line
          x1="10"
          y1="100"
          x2="190"
          y2="100"
          stroke="#71717a"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* DIRT PILE ON THE LEFT */}
        <path
          d="M 10 100 C 25 80, 45 80, 60 100"
          fill="#854d0e"
          opacity="0.85"
        />

        {/* DUMP TRUCK ON THE RIGHT */}
        <g id="dump-truck" className="translate-x-[110px] translate-y-[62px]">
          {/* Truck vibration during idle and dump shaking */}
          <motion.g
            animate={{
              y: [0, -1, 1, -1, 0],
              rotate: [0, -0.5, 0.5, -0.5, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: 0.15,
              repeatType: "mirror"
            }}
          >
            {/* Truck Cab */}
            <path d="M 50 20 L 65 20 L 72 32 L 72 38 L 50 38 Z" fill="#3b82f6" />
            <rect x="52" y="22" width="10" height="8" rx="1" fill="#e0f2fe" />
            
            {/* Dump Bed */}
            <path d="M 10 12 L 48 12 L 48 38 L 10 38 Z" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1" />
            
            {/* Wheels */}
            <circle cx="20" cy="40" r="7" fill="#18181b" />
            <circle cx="20" cy="40" r="3" fill="#e4e4e7" />
            <circle cx="38" cy="40" r="7" fill="#18181b" />
            <circle cx="38" cy="40" r="3" fill="#e4e4e7" />
            <circle cx="60" cy="40" r="7" fill="#18181b" />
            <circle cx="60" cy="40" r="3" fill="#e4e4e7" />

            {/* Earth inside the dump bed - grows as soil falls! */}
            <motion.path
              d="M 12 37 C 18 28, 30 28, 46 37"
              fill="#854d0e"
              initial={{ scaleY: 0 }}
              animate={{
                scaleY: [0, 0, 0.4, 0.8, 1, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ originY: 1 }}
            />
          </motion.g>
        </g>

        {/* EXCAVATOR BODY AND TREADS */}
        <g id="excavator-base" className="translate-x-[15px] translate-y-[62px]">
          {/* Tracks / Treads */}
          <rect x="15" y="32" width="45" height="10" rx="5" fill="#18181b" />
          <line x1="20" y1="37" x2="55" y2="37" stroke="#71717a" strokeWidth="2" strokeDasharray="3 3" />
          
          {/* Cabin */}
          <rect x="20" y="12" width="28" height="20" rx="3" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
          {/* Window */}
          <rect x="34" y="15" width="10" height="10" rx="1" fill="#e0f2fe" />
          {/* Engine compartment counterweight */}
          <rect x="12" y="18" width="10" height="14" rx="2" fill="#d97706" />
        </g>

        {/* ANIMATED EXCAVATOR ARM (BOOM & STICK & BUCKET) */}
        {/* We use an anchor pivot at x=55, y=78 (joint with base) */}
        <g transform="translate(55, 78)">
          {/* Main Boom Arm */}
          <motion.g
            animate={{
              rotate: [-15, -45, -5, -15]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Joint circle at base */}
            <circle cx="0" cy="0" r="5" fill="#18181b" />
            {/* Boom segment */}
            <line x1="0" y1="0" x2="35" y2="-40" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
            <line x1="0" y1="0" x2="35" y2="-40" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />

            {/* Stick (Second Arm Joint) at x=35, y=-40 */}
            <g transform="translate(35, -40)">
              <motion.g
                animate={{
                  rotate: [65, 10, -50, 65]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* Joint circle */}
                <circle cx="0" cy="0" r="4" fill="#18181b" />
                {/* Stick segment */}
                <line x1="0" y1="0" x2="35" y2="10" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="0" y1="0" x2="35" y2="10" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />

                {/* Shovel/Bucket Joint at x=35, y=10 */}
                <g transform="translate(35, 10)">
                  <motion.g
                    animate={{
                      rotate: [-20, 50, -45, -20]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Joint circle */}
                    <circle cx="0" cy="0" r="3" fill="#18181b" />
                    {/* Bucket shape */}
                    <path
                      d="M -3 -3 L 15 -3 L 18 10 L 8 15 L -2 6 Z"
                      fill="#4b5563"
                      stroke="#1f2937"
                      strokeWidth="1"
                    />
                    {/* Shovel Teeth */}
                    <line x1="18" y1="10" x2="22" y2="12" stroke="#1f2937" strokeWidth="1.5" />
                    <line x1="13" y1="13" x2="16" y2="16" stroke="#1f2937" strokeWidth="1.5" />

                    {/* Earth scoop inside bucket - visible when lifting, invisible after dumping */}
                    <motion.circle
                      cx="6"
                      cy="4"
                      r="5"
                      fill="#854d0e"
                      animate={{
                        opacity: [0, 1, 1, 0, 0, 0]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.g>
                </g>
              </motion.g>
            </g>
          </motion.g>
        </g>

        {/* ANIMATED FALLING SOIL PARTICLES */}
        {/* Activated during the dumping stage (around y=35 to 65, x=135) */}
        <g id="falling-soil">
          <motion.circle
            cx="135"
            cy="40"
            r="4.5"
            fill="#854d0e"
            animate={{
              y: [-10, 45],
              x: [130, 134],
              opacity: [0, 1, 1, 0]
            }}
            transition={{
              duration: 4,
              times: [0, 0.48, 0.58, 0.6],
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.circle
            cx="138"
            cy="43"
            r="3.5"
            fill="#a16207"
            animate={{
              y: [-10, 43],
              x: [134, 137],
              opacity: [0, 1, 1, 0]
            }}
            transition={{
              duration: 4,
              times: [0, 0.49, 0.59, 0.61],
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.circle
            cx="132"
            cy="41"
            r="4"
            fill="#713f12"
            animate={{
              y: [-10, 46],
              x: [128, 132],
              opacity: [0, 1, 1, 0]
            }}
            transition={{
              duration: 4,
              times: [0, 0.47, 0.57, 0.59],
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </g>
      </svg>
    </div>
  );
}
