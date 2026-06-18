import React, { useState, useEffect } from 'react';
import { Loader2, Folder, Database, Settings, LogOut, Terminal, ArrowRight, Check, AlertTriangle, Key, Shield, FolderGit2 } from 'lucide-react';

export default function Dashboard({ user, repos, onAddRepo, onSelectRepo, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'my-repos', 'conversations', 'settings'
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  
  // Conversations State
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // GitHub Repos list state
  const [githubRepos, setGithubRepos] = useState([]);
  const [hasGithubToken, setHasGithubToken] = useState(true);
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [indexingRepoName, setIndexingRepoName] = useState(null);

  // Settings State
  const [githubToken, setGithubToken] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);
  const [tokenSuccess, setTokenSuccess] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Fetch conversations history
  useEffect(() => {
    async function fetchConversations() {
      setLoadingConvs(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/query/conversations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoadingConvs(false);
      }
    }
    fetchConversations();
  }, [activeTab]);

  // Fetch personal GitHub repos list
  const fetchGithubRepos = async () => {
    setLoadingGithubRepos(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/repos/github-list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setGithubRepos(data.repos || []);
      setHasGithubToken(data.hasToken);
    } catch (err) {
      console.error('Error fetching github repos:', err);
    } finally {
      setLoadingGithubRepos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my-repos') {
      fetchGithubRepos();
    }
  }, [activeTab, repos]); // Re-evaluate when indexed repos list updates

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newRepoUrl.trim() || registering) return;

    setRegistering(true);
    setError('');
    try {
      await onAddRepo(newRepoUrl.trim());
      setNewRepoUrl('');
    } catch (err) {
      setError(err.message || 'Failed to register repository');
    } finally {
      setRegistering(false);
    }
  };

  const handleIndexRepo = async (htmlUrl, repoName) => {
    setIndexingRepoName(repoName);
    try {
      await onAddRepo(htmlUrl);
      await fetchGithubRepos();
    } catch (err) {
      console.error('Failed to index repo:', err);
      alert(err.message || 'Failed to register repository.');
    } finally {
      setIndexingRepoName(null);
    }
  };

  const handleUpdateToken = async (e) => {
    e.preventDefault();
    if (!githubToken.trim() || updatingToken) return;

    setUpdatingToken(true);
    setTokenSuccess('');
    setTokenError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/github-token', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ githubToken: githubToken.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update token');
      setTokenSuccess('GitHub token updated successfully!');
      setGithubToken('');
    } catch (err) {
      setTokenError(err.message);
    } finally {
      setUpdatingToken(false);
    }
  };

  const handleConnectGithub = async () => {
    try {
      const res = await fetch('/api/auth/github/config');
      const data = await res.json();
      if (!data.clientId) throw new Error('GitHub Client ID not configured.');
      const redirectUri = encodeURIComponent(window.location.origin + '/oauth/callback');
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${data.clientId}&redirect_uri=${redirectUri}&scope=read:user,user:email,repo`;
    } catch (err) {
      console.error(err);
      alert('Failed to connect with GitHub: Client ID missing.');
    }
  };

  // Calculations
  const readyRepos = repos.filter(r => r.status === 'ready').length;
  const totalChunks = repos.reduce((sum, r) => sum + (r.chunkCount || 0), 0);
  const userDisplayName = user?.email ? user.email.split('@')[0] : 'Developer';

  return (
    <div className="bg-background text-on-background antialiased flex overflow-hidden h-screen w-screen font-body-base">
      
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col py-6 px-4 gap-4 bg-surface border-r border-outline-variant w-sidebar-width h-screen fixed left-0 top-0 shrink-0 select-none">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-background">
            <Terminal size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary leading-tight">CodeSage</h1>
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Developer Suite</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all font-medium text-left cursor-pointer
              ${activeTab === 'dashboard' 
                ? 'bg-white/10 text-primary font-semibold' 
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }
            `}
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-[13.5px]">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('my-repos')}
            className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all font-medium text-left cursor-pointer
              ${activeTab === 'my-repos' 
                ? 'bg-white/10 text-primary font-semibold' 
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }
            `}
          >
            <span className="material-symbols-outlined text-[20px]">folder_special</span>
            <span className="text-[13.5px]">My repos</span>
          </button>

          <button 
            onClick={() => setActiveTab('conversations')}
            className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all font-medium text-left cursor-pointer
              ${activeTab === 'conversations' 
                ? 'bg-white/10 text-primary font-semibold' 
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }
            `}
          >
            <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
            <span className="text-[13.5px]">Conversations</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-outline-variant space-y-1">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all font-medium text-left cursor-pointer
              ${activeTab === 'settings' 
                ? 'bg-white/10 text-primary font-semibold' 
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }
            `}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-[13.5px]">Settings</span>
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 py-2 px-3 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all rounded-lg text-left cursor-pointer font-medium"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-[13.5px]">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 ml-0 md:ml-[260px] flex flex-col h-screen overflow-y-auto bg-background">
        
        {/* Top Header */}
        <header className="flex justify-between items-center h-16 px-container-padding w-full bg-background border-b border-outline-variant sticky top-0 z-30 shrink-0 select-none">
          <div className="md:hidden flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">menu</span>
            <span className="font-headline-md text-headline-md font-bold text-primary">CodeSage</span>
          </div>
          <div className="hidden md:block"></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 group cursor-pointer">
              <span className="text-[13px] text-on-surface font-medium group-hover:text-primary transition-colors capitalize">
                {userDisplayName}
              </span>
              <div className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-xs font-bold text-primary select-none">
                {userDisplayName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Panels */}
        <div className="p-container-padding max-w-5xl mx-auto w-full space-y-8 pb-20 flex-1">
          
          {/* Active Tab: Dashboard Panel */}
          {activeTab === 'dashboard' && (
            <>
              {/* Welcome Header */}
              <section className="select-none">
                <h2 className="font-headline-md text-headline-md text-primary font-bold text-2xl capitalize leading-tight">Welcome back, {userDisplayName}</h2>
                <p className="text-body-sm text-on-surface-variant text-[13px] mt-1">Analyze a new repository or resume one of your indexings</p>
              </section>

              {/* Metrics Grid */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-card-gap select-none">
                <div className="bg-[#121214] border border-outline-variant rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">folder</span>
                    <span className="text-emerald-500 font-code-base text-[9.5px] uppercase tracking-wider font-bold">Active</span>
                  </div>
                  <div className="font-display-lg text-[36px] text-primary mb-1 font-bold leading-none">{repos.length}</div>
                  <div className="text-body-sm text-outline-variant text-[12px]">Indexed Repositories</div>
                </div>

                <div className="bg-[#121214] border border-outline-variant rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">database</span>
                    <span className="text-outline-variant font-code-base text-[9.5px] uppercase tracking-wider font-bold">Ready: {readyRepos}</span>
                  </div>
                  <div className="font-display-lg text-[36px] text-primary mb-1 font-bold leading-none">{totalChunks.toLocaleString()}</div>
                  <div className="text-body-sm text-outline-variant text-[12px]">Total Vector Chunks</div>
                </div>

                <div className="bg-[#121214] border border-outline-variant rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">chat_bubble</span>
                    <span className="text-[#a78bfa] font-code-base text-[9.5px] uppercase tracking-wider font-bold">Active Chat Threads</span>
                  </div>
                  <div className="font-display-lg text-[36px] text-[#a78bfa] mb-1 font-bold leading-none">{conversations.length}</div>
                  <div className="text-body-sm text-outline-variant text-[12px]">Saved Conversations</div>
                </div>
              </section>

              {/* Ingestion Panel */}
              <section className="bg-surface-container border border-outline-variant rounded-xl p-6">
                <h3 className="font-headline-sm text-primary mb-2 text-[15px] font-bold">Index public GitHub repository</h3>
                <p className="text-body-sm text-on-surface-variant text-[12.5px] mb-5">Provide a repository URL to parse its files recursively, construct syntax trees, and index embeddings.</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-center w-full">
                  <div className="relative flex-1 w-full">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">link</span>
                    <input 
                      required
                      className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg py-3.5 pl-12 pr-4 text-on-surface placeholder:text-outline-variant font-code-base text-[13px] focus:border-[#8b5cf6] outline-none transition-colors" 
                      placeholder="https://github.com/username/repo" 
                      type="text" 
                      value={newRepoUrl}
                      onChange={e => setNewRepoUrl(e.target.value)}
                      disabled={registering}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={registering}
                    className="w-full md:w-auto bg-primary hover:bg-neutral-200 text-background font-bold px-8 py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 select-none active:scale-[0.98] text-[13px] cursor-pointer"
                  >
                    {registering ? (
                      <Loader2 className="animate-spin text-background" size={16} />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        <span>Analyze</span>
                      </>
                    )}
                  </button>
                </form>
                {error && (
                  <p className="mt-3 text-red-400 text-xs font-semibold">{error}</p>
                )}
                <p className="mt-4 text-[11px] text-outline-variant select-none">
                  Works with public repositories. To import private repositories, connect your GitHub profile via the <button onClick={() => setActiveTab('my-repos')} className="text-primary underline hover:text-[#a78bfa] transition-colors">My repos</button> tab.
                </p>
              </section>

              {/* Indexed Repos List */}
              <section className="space-y-4">
                <div className="flex justify-between items-end border-b border-outline-variant/50 pb-2.5 select-none">
                  <h3 className="font-headline-sm text-primary font-bold text-[15px]">Recently Indexed</h3>
                  <span className="font-code-base text-[10px] text-outline-variant uppercase tracking-wider font-semibold">{repos.length} Total</span>
                </div>
                
                <div className="space-y-3">
                  {repos.length === 0 ? (
                    <div className="text-center py-12 text-outline-variant text-[13px] border border-dashed border-outline-variant rounded-xl select-none">
                      No repositories indexed yet. Enter a GitHub URL above or import one from the "My Repos" tab.
                    </div>
                  ) : (
                    repos.map(repo => (
                      <div key={repo.id} className="bg-[#121214] border border-outline-variant rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-surface-container border border-outline-variant/60 rounded-lg flex items-center justify-center text-outline">
                            <span className="material-symbols-outlined text-[20px]">account_tree</span>
                          </div>
                          <div>
                            <h4 className="text-[13.5px] font-bold text-primary leading-tight">{repo.name}</h4>
                            <div className="flex items-center gap-3 mt-1.5 text-outline font-code-base text-[10px] uppercase select-none">
                              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">inventory_2</span> {repo.chunkCount?.toLocaleString() || 0} chunks</span>
                              <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
                              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">code</span> {repo.language || 'unknown'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 select-none">
                          {repo.status === 'ready' ? (
                            <>
                              <span className="px-2.5 py-0.5 rounded bg-[#132d20] text-[#4ade80] font-code-base text-[9.5px] font-bold border border-[#4ade80]/20 uppercase tracking-wider">Ready</span>
                              <button 
                                onClick={() => onSelectRepo(repo)}
                                className="flex items-center gap-1.5 border border-outline-variant hover:border-[#8b5cf6] hover:bg-[#8b5cf6]/5 px-4 py-2 rounded-lg text-[12.5px] text-[#a78bfa] font-medium transition-colors bg-background active:scale-[0.98] cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                                <span>Chat</span>
                              </button>
                            </>
                          ) : repo.status === 'failed' ? (
                            <>
                              <span className="px-2.5 py-0.5 rounded bg-red-950/30 text-red-400 font-code-base text-[9.5px] font-bold border border-red-500/20 uppercase tracking-wider">Failed</span>
                              <button 
                                disabled
                                className="opacity-45 cursor-not-allowed flex items-center gap-1.5 border border-outline-variant px-4 py-2 rounded-lg text-[12.5px] text-outline-variant bg-background"
                              >
                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                <span>Failed</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="px-2.5 py-0.5 rounded bg-[#2a2015] text-[#facc15] font-code-base text-[9.5px] font-bold border border-[#facc15]/20 uppercase tracking-wider animate-pulse">Indexing</span>
                              <button 
                                disabled
                                className="opacity-60 cursor-not-allowed flex items-center gap-1.5 border border-outline-variant px-4 py-2 rounded-lg text-[12.5px] text-outline-variant bg-background"
                              >
                                <Loader2 size={13} className="animate-spin" />
                                <span>Processing</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}

          {/* Active Tab: My repos (GitHub Integration) */}
          {activeTab === 'my-repos' && (
            <section className="space-y-6 animate-fadeIn">
              <div className="select-none border-b border-outline-variant pb-2.5">
                <h2 className="font-headline-md text-primary font-bold text-2xl">Import GitHub Repository</h2>
                <p className="text-body-sm text-on-surface-variant text-[13px] mt-1">Select and index any of your GitHub repositories with one click</p>
              </div>

              {!hasGithubToken ? (
                /* OAuth Connection Banner */
                <div className="bg-[#121214] border border-outline-variant rounded-xl p-8 flex flex-col items-center text-center gap-4 select-none">
                  <div className="w-12 h-12 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] mb-2">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-primary">GitHub Profile Connection Required</h3>
                    <p className="text-body-sm text-outline-variant text-[12.5px] mt-2 max-w-md mx-auto leading-relaxed">
                      To view and automatically index your public and private repositories, connect your GitHub account securely using OAuth.
                    </p>
                  </div>
                  <button
                    onClick={handleConnectGithub}
                    className="mt-3 flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 16 16">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    <span>Connect GitHub Account</span>
                  </button>
                </div>
              ) : loadingGithubRepos ? (
                /* Loading screen */
                <div className="flex flex-col items-center justify-center py-20 gap-3 select-none">
                  <Loader2 className="animate-spin text-[#a78bfa]" size={32} />
                  <span className="text-xs text-outline font-medium tracking-wide">Loading GitHub repositories...</span>
                </div>
              ) : githubRepos.length === 0 ? (
                /* Empty state */
                <div className="text-center py-16 text-outline-variant text-[13.5px] border border-dashed border-outline-variant rounded-xl select-none">
                  No repositories found on your GitHub profile.
                </div>
              ) : (
                /* Grid list of GitHub repos */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {githubRepos.map(repo => {
                    const isPrivate = repo.isPrivate;
                    const isIndexing = repo.status === 'indexing' || indexingRepoName === repo.name;
                    const isIndexed = repo.status === 'ready';

                    return (
                      <div 
                        key={repo.name} 
                        className="bg-[#121214] border border-outline-variant rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-outline transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-outline">
                              <FolderGit2 size={14} className="text-[#a78bfa]" />
                              <span className="text-[12.5px] font-bold text-primary truncate max-w-[180px] md:max-w-[220px]">
                                {repo.name}
                              </span>
                            </div>
                            <span className={`
                              px-2 py-0.5 rounded text-[9px] font-code-base uppercase tracking-wider font-bold border select-none
                              ${isPrivate 
                                ? 'bg-orange-950/20 text-orange-400 border-orange-500/15' 
                                : 'bg-surface-container text-outline border-outline-variant/30'
                              }
                            `}>
                              {isPrivate ? 'Private' : 'Public'}
                            </span>
                          </div>

                          <p className="text-[12px] text-outline-variant line-clamp-2 h-8 leading-normal pr-1 select-text">
                            {repo.description || 'No description provided.'}
                          </p>

                          <div className="flex items-center gap-1.5 text-[10px] text-outline font-code-base uppercase select-none">
                            <span className="material-symbols-outlined text-[13px]">code</span>
                            <span>{repo.language}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-outline-variant/30 select-none">
                          {isIndexed ? (
                            <button
                              onClick={() => onSelectRepo({ id: repo.id, name: repo.name })}
                              className="w-full flex items-center justify-center gap-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-[12.5px] font-bold transition-all active:scale-[0.98] cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">chat_bubble</span>
                              <span>Chat with RAG</span>
                            </button>
                          ) : isIndexing ? (
                            <button
                              disabled
                              className="w-full opacity-65 cursor-not-allowed flex items-center justify-center gap-1.5 border border-outline-variant px-4 py-2 rounded-lg text-[12.5px] text-outline-variant bg-background"
                            >
                              <Loader2 size={13} className="animate-spin" />
                              <span>Indexing Codebase...</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleIndexRepo(repo.htmlUrl, repo.name)}
                              disabled={indexingRepoName !== null}
                              className="w-full flex items-center justify-center gap-1.5 border border-outline-variant hover:border-primary px-4 py-2 rounded-lg text-[12.5px] text-on-surface font-semibold hover:bg-surface-container-low transition-all cursor-pointer active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-[15px]">search</span>
                              <span>Index Repository</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Active Tab: Conversations panel */}
          {activeTab === 'conversations' && (
            <section className="space-y-6">
              <div className="select-none border-b border-outline-variant pb-2.5">
                <h2 className="font-headline-md text-primary font-bold text-2xl">Conversation History</h2>
                <p className="text-body-sm text-on-surface-variant text-[13px] mt-1">Review or resume your past codebase RAG chats</p>
              </div>

              {loadingConvs ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-primary" size={30} />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-16 text-outline-variant text-[13.5px] border border-dashed border-outline-variant rounded-xl select-none">
                  No conversations saved yet. Head to the dashboard and start a chat to begin.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5">
                  {conversations.map(conv => {
                    const matchedRepo = repos.find(r => r.id === conv.repoId);
                    const lastMsg = conv.messages && conv.messages[0] ? conv.messages[0].content : 'No messages';
                    const date = new Date(conv.createdAt).toLocaleDateString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });

                    return (
                      <div 
                        key={conv.id} 
                        className="bg-[#121214] border border-outline-variant rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-outline transition-colors"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="text-[12.5px] font-bold text-primary font-mono bg-surface-container px-2 py-0.5 rounded border border-outline-variant/40">
                              {conv.repo?.name || 'unknown/repo'}
                            </span>
                            <span className="text-[11px] text-outline-variant">{date}</span>
                          </div>
                          <p className="text-[13px] text-on-surface-variant truncate pr-4 italic">
                            "{lastMsg}"
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            if (matchedRepo) {
                              onSelectRepo(matchedRepo, conv.id);
                            } else {
                              onSelectRepo({ id: conv.repoId, name: conv.repo?.name || 'unknown' }, conv.id);
                            }
                          }}
                          className="flex items-center gap-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-[12.5px] font-bold transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap self-start md:self-auto"
                        >
                          <span>Resume Thread</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Active Tab: Settings panel */}
          {activeTab === 'settings' && (
            <section className="space-y-6">
              <div className="select-none border-b border-outline-variant pb-2.5">
                <h2 className="font-headline-md text-primary font-bold text-2xl">Developer Settings</h2>
                <p className="text-body-sm text-on-surface-variant text-[13px] mt-1">Configure API keys, custom tokens, and credentials</p>
              </div>

              {/* GitHub PAT config */}
              <div className="bg-[#121214] border border-outline-variant rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-3 select-none">
                  <div className="w-8 h-8 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/35 flex items-center justify-center text-[#a78bfa] shrink-0">
                    <Key size={14} />
                  </div>
                  <div>
                    <h3 className="text-[14.5px] font-bold text-primary leading-tight">GitHub Personal Access Token (PAT)</h3>
                    <p className="text-body-sm text-outline-variant text-[12.5px] mt-1">Providing your personal GitHub token increases API rate limits (60/hr &rarr; 5,000/hr) and enables indexing private repositories.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateToken} className="space-y-3 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <input 
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={githubToken}
                      onChange={e => setGithubToken(e.target.value)}
                      disabled={updatingToken}
                      className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface placeholder:text-outline-variant font-code-base text-[13px] focus:border-[#8b5cf6] outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={updatingToken || !githubToken.trim()}
                      className="bg-primary hover:bg-neutral-200 disabled:opacity-40 text-background font-bold px-5 py-2.5 rounded-lg text-[12.5px] transition-colors cursor-pointer active:scale-[0.98]"
                    >
                      {updatingToken ? <Loader2 size={13} className="animate-spin text-background" /> : 'Update Token'}
                    </button>
                    {tokenSuccess && (
                      <span className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                        <Check size={12} /> {tokenSuccess}
                      </span>
                    )}
                    {tokenError && (
                      <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
                        <AlertTriangle size={12} /> {tokenError}
                      </span>
                    )}
                  </div>
                </form>
              </div>

              {/* Profile Details Card */}
              <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4 select-none">
                <h3 className="text-[14px] font-bold text-primary">Account Profile</h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-surface-container-low p-3.5 border border-outline-variant/30 rounded-lg">
                    <div className="text-outline-variant uppercase text-[9px] font-bold">Email address</div>
                    <div className="text-primary text-[12.5px] mt-1 truncate">{user?.email || 'N/A'}</div>
                  </div>
                  <div className="bg-surface-container-low p-3.5 border border-outline-variant/30 rounded-lg">
                    <div className="text-outline-variant uppercase text-[9px] font-bold">Billing Plan</div>
                    <div className="text-primary text-[12.5px] mt-1 capitalize font-bold text-[#a78bfa]">{user?.plan || 'free'}</div>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>
      
      <style>{`
        .animate-fadeIn {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}