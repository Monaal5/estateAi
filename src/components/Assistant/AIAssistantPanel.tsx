import React, { useState } from 'react';
import { useDealContext } from '../../state/dealContext';
import { askAssistant, AssistantResponse } from '../../services/aiAssistantService';
import { Bot, Send, User, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

export const AIAssistantPanel: React.FC = () => {
  const {
    activeDeal,
    canonicalFields,
    tasks,
    requirements,
    latestAnalysis,
    activeRole,
    setSelectedDocForViewer,
    documents,
  } = useDealContext();

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string; citations?: any[] }>
  >([
    {
      sender: 'assistant',
      text: `Hello Sarah! I am your estate AI broker copilot. I am initialized with read-only tools to analyze canonical deal records for "${activeDeal.title}". How can I assist you today?`,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userQ = queryText;
    setQuestion('');
    setMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setIsLoading(true);

    const res: AssistantResponse = await askAssistant({
      deal: activeDeal,
      role: activeRole === 'borrower' ? 'borrower' : 'broker',
      question: userQ,
      canonicalFields,
      tasks,
      requirements,
      latestAnalysis,
    });

    setIsLoading(false);
    setMessages((prev) => [
      ...prev,
      { sender: 'assistant', text: res.answer, citations: res.citations },
    ]);
  };

  const sampleQueries = [
    "What's blocking submission on this file?",
    'Explain the calculated DSCR and lending grade.',
    'Summarize required documents and open tasks.',
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl h-[calc(100vh-170px)] flex flex-col">
      {/* Top Banner */}
      <div className="pb-4 mb-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              estate AI Assistant ({activeRole.toUpperCase()} Copilot)
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                Read-Only Tools Only
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Structurally prohibited from mutating deal state. Answers are generated from canonical facts only.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Transcript */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 text-xs shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-brand-600 text-white font-medium rounded-tr-none shadow-md shadow-brand-600/20'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none font-sans'
              }`}
            >
              <p>{msg.text}</p>

              {/* Citations List */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <p className="text-slate-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Grounded Evidence Citations:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 hover:border-brand-500 text-brand-300 rounded cursor-pointer transition-colors inline-flex items-center gap-1"
                        onClick={() => {
                          if (c.docId) {
                            const doc = documents.find((d) => d.id === c.docId);
                            if (doc) setSelectedDocForViewer(doc);
                          }
                        }}
                      >
                        {c.label}
                        <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-brand-400 font-mono animate-pulse">
            <Bot className="w-4 h-4" /> Querying canonical database & evaluating evidence tools...
          </div>
        )}
      </div>

      {/* Sample Queries Bar */}
      <div className="py-3 flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-slate-800">
        <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">Suggested:</span>
        {sampleQueries.map((sq, sIdx) => (
          <button
            key={sIdx}
            onClick={() => handleAsk(sq)}
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 text-xs font-mono whitespace-nowrap transition-colors"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(question);
        }}
        className="flex items-center gap-2 pt-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask AI assistant about ${activeDeal.title}...`}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          className="px-4 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
