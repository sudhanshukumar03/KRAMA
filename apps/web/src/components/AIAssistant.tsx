import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, X, RefreshCcw, Database } from 'lucide-react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AiResponse, AiConfiguration } from '../types/schema';
import { errorMessage } from '../lib/utils';
type ChatMessage = { role: 'user'; content: string } | { role: 'assistant'; content: string | AiResponse };
type ActionStatus = 'idle' | 'pending' | 'done';
interface ActionFeedback {
  states: Readonly<Record<string, ActionStatus>>;
  start: (key: string) => boolean;
  settle: (key: string, status: 'idle' | 'done') => void;
}

function AIActionButton({ action, navigate, actionKey, feedback }: { action: AiResponse['actions'][number]; navigate: ReturnType<typeof useNavigate>; actionKey: string; feedback: ActionFeedback }) {
  const queryClient = useQueryClient();
  const status = feedback.states[actionKey] || 'idle';
  const activate = async () => {
    if (status !== 'idle') return;
    if (action.type === 'open_page' && action.id) { navigate(`/app/brain?doc=${encodeURIComponent(action.id)}`); return; }
    if (action.type === 'open_project' && action.id) { navigate(`/app/projects/${encodeURIComponent(action.id)}`); return; }
    if (action.type !== 'create_task' && !(action.type === 'complete_task' && action.id)) return;
    if (!feedback.start(actionKey)) return;
    try {
      if (action.type === 'create_task') {
        const title = action.label || action.id || 'New Task';
        await api.tasks.create({ title });
        toast.success(`Task created: "${title}"`);
      } else if (action.id) {
        await api.tasks.complete(action.id);
        toast.success('Task marked as complete');
      }
      void queryClient.invalidateQueries({ queryKey: ['issues'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      feedback.settle(actionKey, 'done');
    } catch (error) {
      feedback.settle(actionKey, 'idle');
      toast.error(errorMessage(error, 'The task could not be updated. Please try again.'));
    }
  };
  return <button type="button" onClick={activate} disabled={status !== 'idle'} aria-busy={status === 'pending'}
    className="min-h-11 rounded-lg border border-border bg-surface-hover hover:enabled:bg-surface text-primary px-3.5 py-2 text-xs font-bold transition-colors shadow-sm disabled:cursor-default disabled:opacity-70 active:enabled:scale-[0.98] cursor-pointer">
    {status === 'done' ? action.type === 'create_task' ? 'Task created' : 'Task completed' : action.label}
  </button>;
}

function AIResponseRenderer({ response, navigate, messageKey, feedback }: { response: string | AiResponse; navigate: ReturnType<typeof useNavigate>; messageKey: number; feedback: ActionFeedback }) {

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

      {response.sections && response.sections.length > 0 && response.sections.map((section, index) => (
        <section key={index} className="space-y-1.5 mt-4">
          <h4 className="font-bold text-[13px] uppercase tracking-wider text-secondary">{section.title}</h4>
          <p className="text-sm text-primary whitespace-pre-wrap leading-relaxed">{section.content}</p>
        </section>
      ))}

      {response.actions && response.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-2">
          {response.actions.map((action, index) => (
            <AIActionButton key={index} action={action} navigate={navigate} actionKey={`${messageKey}:${index}`} feedback={feedback} />
          ))}
        </div>
      )}

      {response.sources && response.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <span className="text-[10px] font-bold text-secondary mb-2 block uppercase tracking-wider">Brain Sources</span>
          <div className="flex flex-wrap gap-1.5">
            {response.sources.map((source) => {
              const docId = source.pageId;
              return (
                <a
                  key={docId}
                  href={`/app/brain?doc=${docId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/app/brain?doc=${docId}`);
                  }}
                  className="text-[10px] font-medium border border-border bg-surface px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors truncate max-w-[220px] text-primary flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span className="opacity-50">📄</span> {source.title}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AIAssistant() {
 const navigate = useNavigate();
 const [isOpen, setIsOpen] = useState(false);
 const [messages, setMessages] = useState<ChatMessage[]>([
 { role: 'assistant', content: 'Hello! I am KRAMA AI. How can I help you today?' }
 ]);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const sendingRef = useRef(false);
 const actionStateRef = useRef<Record<string, ActionStatus>>({});
 const [actionStates, setActionStates] = useState<Record<string, ActionStatus>>({});
 const setActionStatus = (key: string, status: ActionStatus) => {
 actionStateRef.current = { ...actionStateRef.current, [key]: status };
 setActionStates(actionStateRef.current);
 };
 const actionFeedback: ActionFeedback = {
 states: actionStates,
 start: key => {
 if (actionStateRef.current[key] && actionStateRef.current[key] !== 'idle') return false;
 setActionStatus(key, 'pending'); return true;
 },
 settle: setActionStatus,
 };
 const hasPendingAction = Object.values(actionStates).includes('pending');
 const [error, setError] = useState<string | null>(null);
 const [useRag, setUseRag] = useState(false);
 const [config, setConfig] = useState<AiConfiguration | null>(null);
 const bottomRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);
 const openerRef = useRef<HTMLElement | null>(null);
 const closeAssistant = () => {
 setIsOpen(false);
 };

 useEffect(() => {
 const handleOpenAssistant = (e: Event) => {
 openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
 setIsOpen(true);
 const customEvent = e as CustomEvent;
 if (customEvent.detail?.mode === 'rag') {
 setUseRag(true);
 }
 setTimeout(() => inputRef.current?.focus(), 100);
 };

 window.addEventListener('open-ai-assistant', handleOpenAssistant);
 return () => {
 window.removeEventListener('open-ai-assistant', handleOpenAssistant);
 };
 }, []);

 // Modals consume Escape during document capture. Handle the assistant at
 // document bubble so a search/confirmation above it dismisses first, and the
 // shell's window-level Escape action cannot also toggle Focus Mode.
 useEffect(() => {
 if (!isOpen) return;
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key !== 'Escape') return;
 e.preventDefault();
 e.stopPropagation();
 setIsOpen(false);
 };
 document.addEventListener('keydown', handleKeyDown);
 return () => document.removeEventListener('keydown', handleKeyDown);
 }, [isOpen]);

 useEffect(() => {
 if (isOpen) {
 bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
 }
 }, [messages, isOpen]);

 // Only closing the panel restores its opener. A late answer must not move
 // focus out of the next field or dialog the user is already working in.
 useEffect(() => {
 if (!isOpen && openerRef.current) {
 const opener = openerRef.current.isConnected ? openerRef.current : Array.from(document.querySelectorAll<HTMLButtonElement>('[aria-label="Open AI Assistant"]')).find(element => element.getClientRects().length > 0);
 opener?.focus();
 }
 }, [isOpen]);

 useEffect(() => {
 api.ai.config().then((cfg) => {
 setConfig(cfg);
 }).catch(console.error);
 }, []);

 const handleSend = async () => {
 if (!input.trim() || sendingRef.current || config?.available === false) return;
 sendingRef.current = true;
 
 const userMessage = input.trim();
 setInput('');
 setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
 setIsLoading(true);
 setError(null);

 try {
 const payload = { message: userMessage, ragEnabled: useRag && Boolean(config?.ragEnabled) };
 const response = useRag 
 ? await api.ai.ragQuery(payload)
 : await api.ai.complete(payload);
 
 setMessages(prev => [...prev, { 
 role: 'assistant', 
 content: response
 }]);
 } catch (err) {
 console.error(err);
 setInput(userMessage);
 if (err && typeof err === 'object' && 'status' in err && err.status === 429) {
 setError('Rate limit exceeded. Please try again later.');
 } else {
 setError(errorMessage(err, 'Failed to get response'));
 }
 } finally {
 sendingRef.current = false;
 setIsLoading(false);
 }
 };

 const handleRefresh = () => {
 if (sendingRef.current || Object.values(actionStateRef.current).includes('pending')) return;
 actionStateRef.current = {}; setActionStates({});
 setMessages([{ role: 'assistant', content: 'Hello! I am KRAMA AI. How can I help you today?' }]);
 setError(null);
 };

 if (!isOpen) return null;

 return (
 <div className="fixed bottom-6 right-6 w-[calc(100vw-3rem)] sm:w-[420px] h-[650px] max-h-[85vh] flex flex-col v4-card shadow-dark overflow-hidden z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
 <div className="p-4 flex items-center justify-between border-b border-border bg-card shrink-0">
 <div>
 <h1 className="font-bold text-primary flex items-center gap-2 text-base">
 <div className="v4-icon-chip v4-icon-chip-blue scale-75 origin-left">
 <Bot className="w-5 h-5" />
 </div>
 KRAMA AI
 </h1>
 <div className="flex items-center gap-2 mt-1.5">
 <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-secondary font-medium">
 {config?.available === false ? 'AI unavailable' : config?.provider === 'gemini' ? 'Gemini' : 'Groq'}{config?.fallbackAvailable ? ' · automatic fallback' : ''}
 </span>
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
 disabled={isLoading || hasPendingAction}
 className="p-2 rounded-lg text-muted hover:enabled:bg-surface-hover hover:enabled:text-primary transition-colors disabled:opacity-50"
 title="Refresh Conversation"
 >
 <RefreshCcw className="w-4 h-4" />
 </button>
 <button 
 onClick={closeAssistant}
 aria-label="Close AI Assistant"
 title="Close AI Assistant"
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
 <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium">{msg.content}</p>
 ) : (
 <AIResponseRenderer response={msg.content} navigate={navigate} messageKey={idx} feedback={actionFeedback} />
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
 <div role="alert" className="p-3 bg-error-tint text-error rounded-xl text-sm border border-error-tint font-medium">
 {error}
 </div>
 )}
 <div ref={bottomRef} />
 </div>

 <div className="p-3 bg-card border-t border-border shrink-0">
 <div className="relative flex items-center">
 <input
 id="ai-assistant-input"
 name="ai-assistant-input"
 aria-label="Ask KRAMA AI Assistant"
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
 aria-label="Send message to AI Assistant"
 title="Send message"
 disabled={!input.trim() || isLoading || config?.available === false}
 className="absolute right-2 p-2 bg-primary text-surface rounded-lg disabled:opacity-50 transition-colors shadow-sm hover:opacity-90 disabled:hover:opacity-50"
 >
 <Send className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 );
}
