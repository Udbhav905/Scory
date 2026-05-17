"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(181, 225, 139, 0.4), inset 0 0 10px rgba(181, 225, 139, 0.2); }
          50% { box-shadow: 0 0 25px rgba(181, 225, 139, 0.7), inset 0 0 15px rgba(181, 225, 139, 0.4); }
        }
        @keyframes bail-fly-1 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          40% { transform: translateY(-70px) rotate(-140deg); opacity: 1; }
          100% { transform: translateY(180px) rotate(-280deg); opacity: 0; }
        }
        @keyframes bail-fly-2 {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          30% { transform: translateY(-85px) rotate(160deg); opacity: 1; }
          100% { transform: translateY(180px) rotate(340deg); opacity: 0; }
        }
        @keyframes ball-sweep {
          0% { transform: translate(-300px, -80px) scale(0.6); opacity: 0; }
          30% { opacity: 1; }
          45% { transform: translate(0, 20px) scale(1.1); }
          100% { transform: translate(300px, 60px) scale(0.8); opacity: 0; }
        }
        @keyframes stump-shake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-5deg); }
          20% { transform: rotate(4deg); }
          30% { transform: rotate(-3deg); }
          40% { transform: rotate(2deg); }
          50% { transform: rotate(-1deg); }
        }
        @keyframes stadium-glow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        .animate-glow { animation: glow-pulse 2s infinite ease-in-out; }
        .animate-bail-1 { animation: bail-fly-1 3s infinite cubic-bezier(0.25, 1, 0.5, 1); }
        .animate-bail-2 { animation: bail-fly-2 3.2s infinite cubic-bezier(0.25, 1, 0.5, 1); }
        .animate-ball { animation: ball-sweep 3s infinite cubic-bezier(0.25, 1, 0.5, 1); }
        .animate-stump-middle { animation: stump-shake 3s infinite ease-in-out; transform-origin: bottom center; }
      `}</style>

      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans">
        {/* Stadium Lights & Gradients */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#28396C]/20 via-[#131d35]/5 to-transparent pointer-events-none" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#B5E18B]/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

        {/* Stadium Beams */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 left-1/4 w-[1px] h-screen bg-gradient-to-b from-white/30 to-transparent transform -rotate-12 origin-top" />
          <div className="absolute top-0 right-1/4 w-[1px] h-screen bg-gradient-to-b from-white/30 to-transparent transform rotate-12 origin-top" />
        </div>

        {/* Big Stadium Screen DRS style */}
        <div className="w-full max-w-md bg-[#0b0e14] border border-[#28396C]/40 rounded-2xl p-6 shadow-2xl relative z-10 glass-dark mb-10 overflow-hidden">
          {/* Scanline pattern */}
          <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.005)_2px,rgba(255,255,255,0.005)_4px)]" />
          
          <div className="flex justify-between items-center border-b border-white/[0.05] pb-3 mb-6">
            <span className="text-[9px] font-black tracking-[0.3em] text-[#8090A4] uppercase">DRS DECISION REVIEW</span>
            <span className="flex items-center gap-1.5 text-[8px] font-black tracking-widest text-[#B5E18B] border border-[#B5E18B]/30 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 bg-[#B5E18B] rounded-full animate-pulse" />
              LIVE FEED
            </span>
          </div>

          <div className="flex flex-col items-center py-2 relative">
            {/* Stumps Illustration */}
            <div className="w-64 h-52 relative flex justify-center items-end pb-4 mb-4 select-none">
              
              {/* Cricket Ball with trail */}
              <div className="absolute w-6 h-6 bg-gradient-to-br from-red-500 to-red-800 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] z-30 animate-ball flex items-center justify-center">
                <div className="w-full h-px bg-white/40 rotate-45 absolute" />
              </div>

              {/* Glowing flying bails */}
              {/* Left Bail */}
              <div className="absolute left-[72px] bottom-[164px] w-14 h-2 bg-gradient-to-r from-red-500 to-red-400 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.8)] z-20 animate-bail-1" />
              {/* Right Bail */}
              <div className="absolute right-[72px] bottom-[164px] w-14 h-2 bg-gradient-to-r from-red-400 to-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.8)] z-20 animate-bail-2" />

              {/* Stumps */}
              <div className="flex gap-9 items-end h-40 z-10">
                {/* Stump 1 (Left) */}
                <div className="w-3 bg-gradient-to-t from-[#1b263b] via-[#415a77] to-white/90 h-40 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.15)] transform origin-bottom -rotate-2" />
                {/* Stump 2 (Middle - Shakes / Clean Bowled!) */}
                <div className="w-3 bg-gradient-to-t from-[#1b263b] via-[#415a77] to-white/90 h-40 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.15)] transform origin-bottom animate-stump-middle z-20" />
                {/* Stump 3 (Right) */}
                <div className="w-3 bg-gradient-to-t from-[#1b263b] via-[#415a77] to-white/90 h-40 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.15)] transform origin-bottom rotate-2" />
              </div>

              {/* Grass base */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-2 bg-[#B5E18B]/30 rounded-full blur-[1px] shadow-[0_0_12px_rgba(181,225,139,0.3)]" />
            </div>

            {/* Decision Status Panel */}
            <div className="w-full bg-[#160d0d]/40 border border-red-500/20 rounded-xl p-4 text-center mt-2">
              <div className="font-['Barlow_Condensed'] font-black text-4xl text-red-500 tracking-[0.1em] uppercase animate-pulse leading-none">
                404 OUT!
              </div>
              <div className="text-[10px] font-bold text-[#8090A4] uppercase tracking-[0.2em] mt-1.5">
                DECISION: PAGE NOT FOUND
              </div>
            </div>
          </div>
        </div>

        {/* Text descriptions */}
        <div className="text-center max-w-md relative z-10 px-4 mb-8">
          <h1 className="font-['Barlow_Condensed',sans-serif] font-black text-3xl sm:text-4xl text-[#F0F0F0] uppercase tracking-wide leading-none mb-3">
            HOWZAT! That's a Wicket!
          </h1>
          <p className="text-[#8090A4] text-xs sm:text-sm leading-relaxed">
            The page you are looking for has been <strong className="text-[#B5E18B]">clean bowled</strong> by an absolute peach of a delivery. It's either been moved to another pavilion or does not exist at all!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-md relative z-10 px-4">
          <button
            onClick={() => router.back()}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-transparent border border-white/[0.08] text-[#8090A4] font-['Barlow_Condensed',sans-serif] font-black text-xs sm:text-sm tracking-[0.15em] uppercase transition-all duration-200 hover:text-white hover:border-[#B5E18B]/50 hover:bg-[#B5E18B]/5 hover:shadow-[0_0_16px_rgba(181,225,139,0.08)] active:scale-98 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
          
          <Link
            href="/"
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[#B5E18B] text-[#1F2A44] font-['Barlow_Condensed',sans-serif] font-black text-xs sm:text-sm tracking-[0.15em] uppercase shadow-lg shadow-[#B5E18B]/10 transition-all duration-200 hover:bg-[#c8f0a2] hover:shadow-[0_0_20px_rgba(181,225,139,0.3)] active:scale-98 text-center text-decoration-none flex justify-center items-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Pavilion
          </Link>
        </div>

        {/* Accent grass footer indicator */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-[#B5E18B]/30 blur-[2px] animate-glow" />
      </div>
    </>
  );
}
