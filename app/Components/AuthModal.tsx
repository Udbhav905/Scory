"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      onClose();
      router.refresh();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: regName,
        mobile: regMobile,
        email: regEmail,
        password: regPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
    } else {
      
      await signIn("credentials", {
        email: regEmail,
        password: regPassword,
        redirect: false,
      });
      onClose();
      router.refresh();
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: window.location.href });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#0B1322] border border-[#28396C] rounded-lg shadow-2xl p-6 mx-4">
        
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>

       
        <div className="flex gap-4 mb-6 border-b border-[#28396C]">
          <button
            onClick={() => { setIsLogin(true); setError(""); }}
            className={`pb-2 text-lg font-['Barlow_Condensed'] font-bold uppercase tracking-wide ${
              isLogin ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); }}
            className={`pb-2 text-lg font-['Barlow_Condensed'] font-bold uppercase tracking-wide ${
              !isLogin ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 text-red-300 text-sm rounded">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white focus:outline-none focus:border-[#B5E18B]"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white focus:outline-none focus:border-[#B5E18B]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#B5E18B] text-[#1F2A44] font-bold uppercase tracking-wide rounded hover:bg-[#c8f0a2] transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white focus:outline-none focus:border-[#B5E18B]"
            />
            <input
              type="tel"
              placeholder="Mobile Number"
              value={regMobile}
              onChange={(e) => setRegMobile(e.target.value)}
              required
              className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white focus:outline-none focus:border-[#B5E18B]"
            />
            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white focus:outline-none focus:border-[#B5E18B]"
            />
            <input
              type="password"
              placeholder="Password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white focus:outline-none focus:border-[#B5E18B]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#B5E18B] text-[#1F2A44] font-bold uppercase tracking-wide rounded hover:bg-[#c8f0a2] transition"
            >
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#28396C]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0B1322] px-2 text-gray-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-2 border border-[#28396C] rounded text-white hover:bg-[#1A253F] transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}