import React from 'react';
import {
  Inbox,
  FileText,
  CheckSquare,
  ListTodo,
  Calculator,
  Send,
  FileSpreadsheet,
  History,
  Bot,
} from 'lucide-react';

export type TabType =
  | 'inbox'
  | 'documents'
  | 'review'
  | 'requirements'
  | 'analysis'
  | 'submission'
  | 'conditions'
  | 'audit'
  | 'assistant';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  openTasksCount: number;
  unconfirmedCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  openTasksCount,
  unconfirmedCount,
}) => {
  const tabs = [
    { id: 'inbox' as TabType, label: 'Deal Inbox', icon: Inbox },
    { id: 'documents' as TabType, label: 'Documents & OCR', icon: FileText },
    {
      id: 'review' as TabType,
      label: 'Field Review',
      icon: CheckSquare,
      badge: unconfirmedCount > 0 ? unconfirmedCount : undefined,
    },
    {
      id: 'requirements' as TabType,
      label: 'Needs List & Tasks',
      icon: ListTodo,
      badge: openTasksCount > 0 ? openTasksCount : undefined,
    },
    { id: 'analysis' as TabType, label: 'DSCR & Grading', icon: Calculator },
    { id: 'submission' as TabType, label: 'Lender Submission', icon: Send },
    { id: 'conditions' as TabType, label: 'Lender Conditions', icon: FileSpreadsheet },
    { id: 'assistant' as TabType, label: 'AI Assistant', icon: Bot },
    { id: 'audit' as TabType, label: 'Audit Log', icon: History },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 pt-2 flex space-x-1 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? 'border-brand-500 text-brand-400 bg-slate-850/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
