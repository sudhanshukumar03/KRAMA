import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, User, X, RefreshCcw, Database } from 'lucide-react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

export function AIResponseRenderer({ response, navigate }: { response: any, navigate: any }) {
  if (typeof response === 'string') {
    return <p className="whitespace-pre-wrap leading-relaxed text-sm">{response}</p>;
  }

  return (
    <div className="space-y-4">
      {response.title && (
        <h3 className="font-semibold text-sm border-b border-border/30 pb-1.5 mb-2 text-primary">
          {response.title}
        </h3>
      )}

      {response.answer && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-primary">
          {response.answer}
        </p>
      )}

      {response.sections && response.sections.length > 0 && response.sections.map((section: any, index: number) => (
        <section key={index} className="space-y-1.5 mt-4">
          <h4 className="font-bold text-[13px] uppercase tracking-wider text-secondary">{section.title}</h4>
          <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">{section.content}</p>
        </section>
      ))}

      {response.actions && response.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-2">
          {response.actions.map((action: any, index: number) => (
            <button
              key={index}
              onClick={() => {
                if (action.type === 'open_page' && action.id) {
                  navigate(`/app/pages/${action.id}`);
                } else if (action.type === 'open_project' && action.id) {
                  navigate(`/app/projects/${action.id}`);
                }
              }}
              className="rounded-lg border border-border bg-surface-hover hover:bg-surface text-primary px-3.5 py-2 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {response.sources && response.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <span className="text-[10px] font-bold text-secondary mb-2 block uppercase tracking-wider">Brain Sources</span>
          <div className="flex flex-wrap gap-1.5">
            {response.sources.map((source: any) => (
              <a
                key={source.pageId || source.id}
                href={`/app/pages/${source.pageId || source.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-medium border border-border bg-surface px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors truncate max-w-[220px] text-primary flex items-center gap-1.5 shadow-2xs"
              >
                <span className="opacity-50">📄</span> {source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AIAssistant() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: any, sources?: any[]}>>([
    { role: 'assistant', content: 'Hello! I am KRAMA AI. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRag, setUseRag] = useState(false);
  const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini');
  const [config, setConfig] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenAI = (e: Event) => {
      setIsOpen(true);
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.mode === 'rag') {
        setUseRag(true);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('open-ai-assistant', handleOpenAI);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-ai-assistant', handleOpenAI);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    api.ai.config().then(setConfig).catch(console.error);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      const payload = { message: userMessage, provider, ragEnabled: useRag };
      const response = useRag 
        ? await api.ai.ragQuery(payload)
        : await api.ai.complete(payload);
        
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response,
        sources: response.sources || []
      }]);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 429) {
        setError('Rate limit exceeded. Please try again later.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to get response');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setMessages([{ role: 'assistant', content: 'Hello! I am KRAMA AI. How can I help you today?' }]);
    setError(null);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-surface shadow-xl flex items-center justify-center hover:opacity-90 hover:scale-105 transition-all z-50 group border border-border"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-[420px] h-[650px] max-h-[85vh] flex flex-col v4-card shadow-dark overflow-hidden z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="p-4 flex items-center justify-between border-b border-border bg-card shrink-0">
        <div>
          <h1 className="font-bold text-primary flex items-center gap-2 text-base">
            <div className="v4-icon-chip v4-icon-chip-blue scale-75 origin-left">
              <Sparkles className="w-5 h-5" />
            </div>
            KRAMA AI
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'gemini' | 'groq')}
              className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-secondary outline-none cursor-pointer font-medium"
              title="Select AI Agent"
            >
              <option value="gemini">Gemini</option>
              <option value="groq">Groq</option>
            </select>
            {config?.ragEnabled && (
              <button 
                onClick={() => setUseRag(!useRag)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  useRag ? 'bg-primary text-surface border-primary' : 'bg-surface text-secondary border-border hover:bg-surface-hover'
                }`}
                title="Toggle RAG Mode"
              >
                <Database className="w-3 h-3" />
                {useRag ? 'RAG ON' : 'RAG OFF'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-lg text-muted hover:bg-surface-hover hover:text-primary transition-colors"
            title="Refresh Conversation"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg text-muted hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-canvas">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
              msg.role === 'user' ? 'bg-primary text-surface border-primary' : 'bg-surface text-primary border-border'
            }`}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-primary text-surface border-primary rounded-tr-none' 
                : 'bg-card border-border text-primary rounded-tl-none'
            }`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">{msg.content as string}</p>
              ) : (
                <AIResponseRenderer response={msg.content} navigate={navigate} />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-surface text-primary border border-border flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none text-muted text-sm flex items-center gap-2 shadow-sm">
              <span className="animate-pulse font-medium">Analyzing...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm border border-red-500/20 font-medium">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-card border-t border-border shrink-0">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask KRAMA..."
            className="w-full bg-surface border border-border rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none text-primary placeholder:text-muted"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-primary text-surface rounded-lg disabled:opacity-50 transition-colors shadow-sm hover:opacity-90 disabled:hover:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
