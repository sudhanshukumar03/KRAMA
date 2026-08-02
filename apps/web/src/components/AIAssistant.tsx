import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { Sparkles, Send, Bot, User, Database } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; title: string }>;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your AI Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [useRag, setUseRag] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const response = useRag 
        ? await api.ai.ragQuery({ prompt: userMessage })
        : await api.ai.complete({ prompt: userMessage });
        
      const assistantMessage = response.completion || 'No response received.';
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: assistantMessage,
        sources: response.sources
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

  return (
    <div className="h-full flex flex-col bg-canvas">
      <div className="p-8 pb-4 flex items-center justify-between border-b border-border bg-card">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <div className="v4-icon-chip v4-icon-chip-blue">
              <Sparkles className="w-5 h-5" />
            </div>
            Powered by KRAMA AI
          </h1>
          <div className="flex items-center gap-4 mt-3 text-xs font-mono text-muted">
            <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-border">
              <span className="font-semibold text-secondary">Provider:</span> {config?.provider || 'Loading...'}
            </div>
            <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-border">
              <span className="font-semibold text-secondary">Model:</span> {config?.model || 'Loading...'}
            </div>
            <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-border">
              <span className="font-semibold text-secondary">Memory:</span> {config?.memoryEnabled ? 'Enabled' : 'Disabled'}
            </div>
            <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-border">
              <span className="font-semibold text-secondary">Knowledge Base:</span> {config?.ragEnabled ? 'Connected' : 'Not Connected'}
            </div>
            
            {config?.ragEnabled && (
              <button 
                onClick={() => setUseRag(!useRag)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
                  useRag 
                    ? 'bg-blue-500 text-white border-blue-600' 
                    : 'bg-surface text-secondary border-border hover:bg-surface/80'
                }`}
                title="Toggle context-aware generation based on your notes"
              >
                <Database className="w-3 h-3" />
                {useRag ? 'RAG: Notes Search ON' : 'RAG: Notes Search OFF'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-[#3B82F6] text-white' : 'bg-surface text-primary border border-border'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[70%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-[#3B82F6] text-white rounded-tr-none' 
                : 'bg-card border border-border text-primary rounded-tl-none shadow-sm'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <span className="text-xs font-semibold opacity-70 mb-2 block">Sources:</span>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map(src => (
                      <a 
                        key={src.id} 
                        href={`/app/pages/${src.id}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs border px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        style={{ borderColor: 'currentColor', opacity: 0.9 }}
                      >
                        {src.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-surface text-primary border border-border flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none text-muted text-sm flex items-center gap-2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center justify-between">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-6 bg-card border-t border-border">
        <div className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="w-full bg-surface border border-border rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 text-muted hover:text-[#3B82F6] disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
