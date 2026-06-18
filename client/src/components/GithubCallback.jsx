import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, ArrowLeft, Terminal } from 'lucide-react';

export default function GithubCallback({ onAuthSuccess, onBack }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setError('OAuth authorization code is missing.');
      setLoading(false);
      return;
    }

    exchangeStarted.current = true;

    async function exchangeCode() {
      try {
        const response = await fetch('/api/auth/github', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });
        
        let data = {};
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error(text || `Server returned an invalid response status: ${response.status}`);
        }
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'GitHub authentication failed');
        }

        // Clean query parameters from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Save to storage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Notify parent app
        onAuthSuccess(data.user);
      } catch (err) {
        console.error('OAuth exchange error:', err);
        setError(err.message || 'An error occurred during authentication.');
        setLoading(false);
      }
    }

    exchangeCode();
  }, [onAuthSuccess]);

  return (
    <div className="min-h-screen w-screen bg-background flex flex-col items-center justify-center p-container-padding font-body-base text-on-background select-none">
      <div className="w-full max-w-sm bg-[#121214] border border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center gap-6 shadow-2xl relative overflow-hidden">
        
        {/* Subtle top light bar */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-[#8b5cf6]"></div>

        {/* Brand */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-background">
            <Terminal size={13} strokeWidth={2.5} />
          </div>
          <span className="font-headline-md text-headline-sm font-bold text-primary tracking-wide text-[14px]">CodeSage</span>
        </div>

        {loading ? (
          <div className="space-y-4 flex flex-col items-center">
            <Loader2 className="animate-spin text-[#a78bfa]" size={32} />
            <div>
              <h3 className="text-[14px] font-bold text-primary">GitHub Authentication</h3>
              <p className="text-[12px] text-outline-variant mt-1.5 leading-relaxed">Exchanging authorization code and issuing developer session token...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 flex flex-col items-center w-full">
            <div className="w-10 h-10 rounded-full bg-red-950/30 border border-red-500/25 flex items-center justify-center text-red-400">
              <AlertCircle size={20} />
            </div>
            
            <div>
              <h3 className="text-[14px] font-bold text-red-400 leading-tight">Authentication Error</h3>
              <p className="text-[12px] text-outline-variant mt-2 leading-relaxed whitespace-pre-wrap px-2">{error}</p>
            </div>

            <button
              onClick={onBack}
              className="mt-2 w-full flex items-center justify-center gap-2 border border-outline-variant hover:border-primary px-4 py-2.5 rounded-lg text-on-surface text-[12.5px] font-semibold transition-colors cursor-pointer active:scale-[0.98]"
            >
              <ArrowLeft size={13} />
              <span>Back to Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
