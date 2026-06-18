import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ChatView from './components/ChatView';
import GithubCallback from './components/GithubCallback';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);

  // Check if we are on the OAuth callback URL
  const isOauthCallback = window.location.pathname === '/oauth/callback';

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setAuthChecked(true);
  }, []);

  // Polling for indexing repositories status updates
  useEffect(() => {
    if (!user || repos.length === 0) return;
    if (!repos.some(r => r.status === 'indexing')) return;

    const interval = setInterval(async () => {
      await fetchRepos();
    }, 4000);

    return () => clearInterval(interval);
  }, [repos, user]);

  useEffect(() => { 
    if (user) fetchRepos(); 
  }, [user]);

  async function fetchRepos() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/repos', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { 
        handleLogout(); 
        return; 
      }
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (err) {
      console.error('Failed to fetch repos:', err);
    }
  }

  async function handleAddRepo(url) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ githubUrl: url })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to index repository');
      }
      await fetchRepos();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  function handleLogout() { 
    localStorage.clear(); 
    setUser(null); 
    setSelectedRepo(null); 
    setActiveConversationId(null);
    setShowAuth(false); 
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen w-screen bg-background flex items-center justify-center text-outline-variant select-none font-body-base text-sm">
        Loading...
      </div>
    );
  }

  // Intercept and route OAuth callback path
  if (isOauthCallback) {
    return (
      <GithubCallback 
        onAuthSuccess={(u) => {
          setUser(u);
          window.location.href = '/';
        }} 
        onBack={() => {
          window.location.href = '/';
        }} 
      />
    );
  }

  if (!user) {
    if (!showAuth) {
      return <Landing onNavigate={(page) => { if (page === 'auth') setShowAuth(true); }} />;
    }
    return <Auth onAuthSuccess={u => setUser(u)} onBack={() => setShowAuth(false)} />;
  }

  // If a repo is selected for chat, show the ChatView
  if (selectedRepo) {
    return (
      <ChatView
        user={user}
        repo={selectedRepo}
        repos={repos}
        conversationId={activeConversationId}
        onBack={() => {
          setSelectedRepo(null);
          setActiveConversationId(null);
          fetchRepos();
        }}
        onLogout={handleLogout}
      />
    );
  }

  // Otherwise show Dashboard
  return (
    <Dashboard
      user={user}
      repos={repos}
      onAddRepo={handleAddRepo}
      onSelectRepo={(repo, conversationId = null) => {
        setSelectedRepo(repo);
        setActiveConversationId(conversationId);
      }}
      onLogout={handleLogout}
    />
  );
}