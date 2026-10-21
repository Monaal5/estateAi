import React, { useRef, useState } from 'react';
import { Building2, Loader2, UploadCloud, X } from 'lucide-react';
import { api } from './api';

const DOC_TYPES = ['Loan Application', 'Auto-detect', 'Operating Statement', 'Rent Roll', 'Appraisal', 'Purchase Agreement'];

/** Onboard a NEW client from their loan package: the backend reads it, creates a saved deal, and stores the file. */
export const NewClientModal: React.FC<{ onClose: () => void; onCreated: (deal: any, warnings: string[]) => void }> = ({ onClose, onCreated }) => {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || busy) return;
    if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) { setError('Please choose a PDF or an image scan (JPG, PNG, WEBP).'); return; }
    setError(null); setBusy(file.name);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType === 'Auto-detect' ? 'Other' : docType);
      const r = await api('/deals/from-document', { method: 'POST', body: fd });
      onCreated(r.deal, r.warnings || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1f3a]/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div id="new-client-modal" role="dialog" aria-modal="true" aria-labelledby="new-client-title" onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#0b1f3a] to-blue-700 px-6 py-4 text-white flex items-start gap-3">
          <Building2 className="w-6 h-6 mt-0.5 text-blue-200" />
          <div className="flex-1">
            <h2 id="new-client-title" className="font-extrabold text-lg">New client from document</h2>
            <p className="text-xs text-blue-100">Upload the client's loan package. AI reads it, creates a saved deal under their company name, and stores the original file.</p>
          </div>
          <button id="new-client-close" onClick={onClose} disabled={!!busy} className="text-blue-200 hover:text-white disabled:opacity-40" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Document type</span>
            <select id="new-client-doc-type" value={docType} onChange={(e) => setDocType(e.target.value)} disabled={!!busy} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5">
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <div
            id="new-client-dropzone"
            onClick={() => !busy && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
          >
            {busy ? <Loader2 className="w-9 h-9 mx-auto text-blue-600 animate-spin" /> : <UploadCloud className="w-9 h-9 mx-auto text-slate-400" />}
            <p className="text-sm font-semibold text-[#0b1f3a] mt-2">{busy ? `AI is reading ${busy}…` : 'Drop the client PDF here, or click to choose'}</p>
            <p className="text-xs text-slate-500">{busy ? 'Creating the deal and saving the document — this usually takes under a minute.' : 'PDF or scanned image · max 20 MB'}</p>
            <input ref={inputRef} id="new-client-input" type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files)} />
          </div>
          {error && <p id="new-client-error" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>}
        </div>
      </div>
    </div>
  );
};
