import React, { useState } from 'react';
import { Terminal, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Auth({ onAuthSuccess, onBack }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGithubOAuth() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/github/config');
      const data = await res.json();
      if (!data.clientId) {
        throw new Error('GitHub Client ID not configured on server.');
      }
      
      const redirectUri = encodeURIComponent(window.location.origin + '/oauth/callback');
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${data.clientId}&redirect_uri=${redirectUri}&scope=read:user,user:email,repo`;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-screen bg-background flex flex-col items-center justify-center p-container-padding font-body-base text-on-background select-none">
      <div className="w-full max-w-sm bg-[#121214] border border-outline-variant rounded-xl p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden font-body-base">
        
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-[#8b5cf6]"></div>

        {/* Brand Header */}
        <div className="flex items-center gap-2.5 justify-center mb-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-background">
            <Terminal size={18} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-headline-md font-bold text-primary tracking-wide">
            Code<span className="text-[#a78bfa]">Sage</span>
          </h2>
        </div>

        <p className="text-[12px] text-outline text-center leading-relaxed max-w-[280px] mx-auto">
          Sign in using your GitHub account to access your repositories and chat with CodeSage.
        </p>

        {error && (
          <div className="p-3 bg-red-950/20 border border-red-500/25 text-red-400 text-xs rounded-lg select-text">
            {error}
          </div>
        )}

        {/* GitHub OAuth Button */}
        <button
          onClick={handleGithubOAuth}
          type="button"
          disabled={loading}
          className="w-full mt-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-45 text-white text-[13px] font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
        >
          <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>{loading ? 'Redirecting to GitHub...' : 'Continue with GitHub'}</span>
          {!loading && <ArrowRight size={14} />}
        </button>

        {onBack && (
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 border border-outline-variant hover:border-primary px-4 py-2.5 rounded-lg text-on-surface text-[12.5px] font-semibold transition-colors cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 justify-center mt-2 text-[10px] text-outline-variant font-medium select-none">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>OAuth authentication is secure and handled by GitHub</span>
        </div>

      </div>
    </div>
  );
}