import { useState, useRef, useMemo } from 'react';
import { Sparkles, X, Info, RefreshCw, Send } from 'lucide-react';
import { api } from '../../api/client';
import { BaseButton } from '../ui/BaseButton';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export interface GroundedAIPanelProps {
  documentId: string;
  documentTitle: string;
  editor: any;
  isOpen: boolean;
  onClose: () => void;
}

export function GroundedAIPanel({
  documentId,
  documentTitle,
  editor,
  isOpen,
  onClose
}: GroundedAIPanelProps) {
  const [tab, setTab] = useState<'ask' | 'compose'>('ask');
  const [question, setQuestion] = useState('');
  const [askOutput, setAskOutput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const [composeMode, setComposeMode] = useState<'write' | 'improve' | 'explain'>('write');
  const [composeInstruction, setComposeInstruction] = useState('');
  const [composeOutput, setComposeOutput] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Read selection from editor if any
  const selectionText = useMemo(() => {
    if (!isOpen || !editor || editor.isDestroyed) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  }, [editor, isOpen]);

  const handleAsk = () => {
    if (!question.trim()) return;
    setAskOutput('');
    setIsAsking(true);
    abortControllerRef.current = new AbortController();

    api.documents.aiAsk(
      documentId,
      question,
      (chunk) => setAskOutput(prev => prev + chunk),
      () => setIsAsking(false),
      (err) => {
        setIsAsking(false);
        toast.error('AI Q&A failed: ' + (err?.message || 'Check AI API key configuration'));
      },
      abortControllerRef.current.signal
    );
  };

  const handleCompose = () => {
    if (!composeInstruction.trim()) return;
    setComposeOutput('');
    setIsComposing(true);
    abortControllerRef.current = new AbortController();

    api.documents.aiCompose(
      documentId,
      {
        instruction: composeInstruction,
        mode: composeMode,
        selection: selectionText || undefined
      },
      (chunk) => setComposeOutput(prev => prev + chunk),
      () => setIsComposing(false),
      (err) => {
        setIsComposing(false);
        toast.error('AI Compose failed: ' + (err?.message || 'Check AI API key configuration'));
      },
      abortControllerRef.current.signal
    );
  };

  const handleInsertIntoEditor = (text: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
    toast.success('Inserted AI content into editor');
  };

  const handleReplaceSelection = (text: string) => {
    if (!editor) return;
    editor.chain().focus().deleteSelection().insertContent(text).run();
    toast.success('Replaced selection with AI content');
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 border-l border-border bg-surface flex flex-col h-full shrink-0 shadow-xl z-20 font-sans animate-in slide-in-from-right duration-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-primary text-body">Grounded AI Assist</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-primary hover:bg-surface-hover">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-border bg-surface-hover/40 text-caption font-mono font-bold">
        <button
          onClick={() => setTab('ask')}
          className={cn("flex-1 py-2.5 text-center transition-all border-b-2",
            tab === 'ask'
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-surface"
              : "border-transparent text-secondary hover:text-primary"
          )}
        >
          Ask Notes
        </button>
        <button
          onClick={() => setTab('compose')}
          className={cn("flex-1 py-2.5 text-center transition-all border-b-2",
            tab === 'compose'
              ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-surface"
              : "border-transparent text-secondary hover:text-primary"
          )}
        >
          Compose & Refine
        </button>
      </div>

      {/* Tab 1: Ask Notes */}
      {tab === 'ask' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-caption font-mono text-secondary flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>Grounded in <strong className="text-primary font-sans">{documentTitle}</strong> and its 1-hop reference documents.</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask anything about this spec..."
              className="flex-1 p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-sans text-caption"
            />
            <BaseButton disabled={isAsking || !question.trim()} onClick={handleAsk} className="px-3 py-1.5">
              {isAsking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </BaseButton>
          </div>

          {askOutput && (
            <div className="flex-1 p-3.5 rounded-xl border border-border bg-surface-hover/30 text-caption font-sans leading-relaxed text-primary overflow-y-auto whitespace-pre-wrap">
              {askOutput}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Compose & Refine */}
      {tab === 'compose' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Task Mode</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['write', 'improve', 'explain'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setComposeMode(m)}
                  className={cn("py-1.5 px-2 rounded-lg text-caption font-mono font-bold capitalize transition-all border",
                    composeMode === m
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                      : "border-border text-secondary hover:bg-surface-hover"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {selectionText && composeMode !== 'write' && (
            <div className="p-2.5 rounded-xl border border-border bg-surface-hover/40 text-caption">
              <span className="font-bold text-secondary font-mono text-[10px] uppercase block mb-1">Target Selection:</span>
              <p className="line-clamp-3 italic text-secondary font-mono text-[11px]">{selectionText}</p>
            </div>
          )}

          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Instruction</label>
            <textarea
              rows={3}
              value={composeInstruction}
              onChange={(e) => setComposeInstruction(e.target.value)}
              placeholder={composeMode === 'write' ? 'e.g. Outline deployment architecture checklist...' : 'e.g. Make it more concise and formal...'}
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-sans text-caption resize-none"
            />
          </div>

          <BaseButton disabled={isComposing || !composeInstruction.trim()} onClick={handleCompose} className="w-full py-2">
            {isComposing ? 'Generating...' : 'Generate with AI'}
          </BaseButton>

          {composeOutput && (
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="p-3.5 rounded-xl border border-border bg-surface-hover/30 text-caption font-sans leading-relaxed text-primary overflow-y-auto whitespace-pre-wrap max-h-60">
                {composeOutput}
              </div>
              <div className="flex gap-2">
                <BaseButton
                  onClick={() => handleInsertIntoEditor(composeOutput)}
                  className="flex-1 text-caption py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                >
                  Insert at Cursor
                </BaseButton>
                {selectionText && (
                  <BaseButton
                    onClick={() => handleReplaceSelection(composeOutput)}
                    className="flex-1 text-caption py-1.5"
                  >
                    Replace Selection
                  </BaseButton>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
