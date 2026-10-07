import React from 'react';
import { ExternalLink, FileSearch } from 'lucide-react';
import { useDealContext } from '../../state/dealContext';

interface SourceLinkProps {
  docId?: string;
  docName?: string;
  page?: number;
  region?: { x: number; y: number; width: number; height: number };
  onNavigateToDocument?: () => void;
}

export const SourceLink: React.FC<SourceLinkProps> = ({
  docId,
  docName,
  page,
  region,
  onNavigateToDocument,
}) => {
  const { documents, setSelectedDocForViewer, setHighlightedRegion } = useDealContext();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (docId) {
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        setSelectedDocForViewer(doc);
        if (region) {
          setHighlightedRegion(region);
        }
      }
    }
    if (onNavigateToDocument) {
      onNavigateToDocument();
    }
  };

  if (!docId && !docName) {
    return <span className="text-xs text-slate-500 font-mono">Borrower Stated</span>;
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-brand-300 hover:text-brand-200 border border-slate-700/80 hover:border-brand-500/50 rounded text-xs font-mono transition-all group"
      title="Click to view original source document and region evidence"
    >
      <FileSearch className="w-3.5 h-3.5 text-brand-400 group-hover:scale-110 transition-transform" />
      <span className="truncate max-w-[180px]">{docName || docId}</span>
      {page && <span className="text-slate-400">p.{page}</span>}
      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-brand-400" />
    </button>
  );
};
