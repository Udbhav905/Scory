"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import AuthModal from "./AuthModal";

export default function Header() {
  // ✅ All hooks called unconditionally at the top
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Now it's safe to return early
  /* Header should be visible on the home page; removed early return that hid it */

  // Mock cricket scores for the ticker
  const matches = [
    { team1: "AUS", team2: "ENG", score: "214/4", overs: "28.2", live: true },
    { team1: "IND", team2: "NZ", score: "187/6", overs: "35.1", live: false },
    { team1: "SA", team2: "PAK", score: "302/8", overs: "50.0", live: false },
    { team1: "SL", team2: "BAN", score: "156/2", overs: "24.3", live: true },
    { team1: "WI", team2: "AFG", score: "98/4", overs: "18.2", live: false },
  ];
  const tickerItems = [...matches, ...matches];

  const getUserInitials = () => {
    if (!session?.user?.name) return "U";
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>


      <header className="relative sticky top-0 z-50 font-sans bg-ink-black border-b border-lavender-grey/10 shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
        <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.012)_3px,rgba(255,255,255,0.012)_4px)] z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0">
              <div className="w-full h-full flex items-center justify-center transition-transform duration-500 [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)] bg-gradient-to-br from-[#28396C] to-[#3F5F9E] group-hover:scale-105 group-hover:rotate-12">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#F0FFC2]">
                  <path d="M4.5 19.5l7.5-7.5 3 3-7.5 7.5H4.5v-3z" />
                  <path d="M19 3a2 2 0 0 1 2 2c0 .55-.22 1.05-.59 1.41L13 13.83l-2.83-2.83 7.42-7.41C17.95 3.22 18.45 3 19 3z" />
                </svg>
              </div>
              <div className="absolute -top-1 -left-1 w-2 h-0.5 bg-[#B5E18B] opacity-0 group-hover:opacity-60 transition-opacity" />
              <div className="absolute -top-1 -left-1 w-0.5 h-2 bg-[#B5E18B] opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
            <div className="flex flex-col leading-none">
              <div className="font-['Barlow_Condensed',sans-serif] font-black text-2xl sm:text-3xl tracking-wide text-[#F0F0F0] uppercase leading-none">
                Sc<span className="text-[#B5E18B]">o</span>ry
              </div>
              <div className="font-['Barlow_Condensed',sans-serif] font-semibold text-[9px] tracking-[0.35em] text-[#EAE6BC] uppercase">
                Live Cricket
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/live"
              className="relative flex items-center gap-2 px-4 h-9 rounded-sm bg-[#B5E18B] text-[#1F2A44] font-['Barlow_Condensed',sans-serif] font-bold text-xs sm:text-sm tracking-wider uppercase transition-all hover:bg-[#c8f0a2] hover:-translate-y-px overflow-hidden group/btn"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E03333] shadow-[0_0_0_0_rgba(224,51,51,0.7)] animate-[live-pulse_1.4s_ease-out_infinite]" />
              Live
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
            </Link>

            <div className="w-px h-5 bg-white/10" />

            {status === "authenticated" ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-[#1A253F] transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B5E18B] to-[#8BC34A] flex items-center justify-center text-[#1F2A44] font-bold uppercase text-sm">
                    {getUserInitials()}
                  </div>
                  <span className="hidden sm:inline text-[#EAE6BC] text-sm font-medium">
                    {session.user?.name?.split(" ")[0]}
                  </span>
                  <svg className="w-4 h-4 text-[#8090A4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-10 w-48 bg-[#0B1322] border border-[#28396C] rounded-md shadow-lg py-1 z-60">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 z-75 text-sm text-[#EAE6BC] hover:bg-[#1A253F] transition"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="block w-full text-left px-4 py-2 text-sm text-[#EAE6BC] hover:bg-[#1A253F] transition"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center px-4 h-9 rounded-sm bg-transparent text-[#A0A8B4] font-['Barlow_Condensed',sans-serif] font-semibold text-xs sm:text-sm tracking-wider uppercase border border-white/10 transition-all hover:text-white hover:border-[#B5E18B]/50 hover:bg-[#B5E18B]/5 hover:-translate-y-px"
              >
                Login
              </button>
            )}
          </div>
        </div>

        <div className="relative h-[2px] bg-[#1A253F] overflow-hidden">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#B5E18B] via-50% to-transparent opacity-70 animate-[bar-sweep_3.5s_ease-in-out_infinite]" />
        </div>

        <div className="relative z-10 h-7 bg-[#0D1422] border-b border-white/5 hidden sm:flex items-center overflow-hidden">
          <div className="flex-shrink-0 flex items-center gap-1.5 px-4 h-full bg-[#28396C] font-['Barlow_Condensed',sans-serif] font-bold text-[10px] tracking-[0.2em] text-[#F0FFC2] uppercase border-r-2 border-[#3F5F9E]">
            SCORES
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center animate-[ticker-move_28s_linear_infinite] whitespace-nowrap">
              {tickerItems.map((match, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-6 font-['Barlow_Condensed',sans-serif] text-[11px] font-semibold tracking-wide text-[#8090A4] uppercase border-r border-white/5"
                >
                  <span className="text-[#E0E8F0] font-bold">{match.team1}</span>
                  <span>vs</span>
                  <span className="text-[#E0E8F0] font-bold">{match.team2}</span>
                  <span className="text-[#B5E18B] font-bold">{match.score}</span>
                  <span className="text-[#EAE6BC]">({match.overs})</span>
                  {match.live && (
                    <span className="text-[9px] font-bold tracking-[0.15em] text-[#E03333] border border-[#E03333]/60 px-1.5 py-px rounded-sm">
                      LIVE
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}