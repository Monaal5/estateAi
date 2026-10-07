import React, { useState } from 'react';
import { useDealContext } from '../../state/dealContext';
import { Document } from '../../types';
import { FileText, UploadCloud, Eye, CheckCircle, Shield, Layers, AlertCircle } from 'lucide-react';

export const DocumentViewer: React.FC = () => {
  const {
    documents,
    selectedDocForViewer,
    setSelectedDocForViewer,
    highlightedRegion,
    uploadDocument,
    activeRole,
  } = useDealContext();

  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadDocType, setUploadDocType] = useState<Document['docType']>('tax_return');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleSimulatedUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFilename) return;
    uploadDocument(uploadFilename, uploadDocType);
    setUploadFilename('');
    setShowUploadModal(false);
  };

  const currentDoc = selectedDocForViewer || documents[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-170px)]">
      {/* Left: Document List Sidebar */}
      <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            <h2 className="font-bold text-white text-sm">Deal Documents ({documents.length})</h2>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload File
          </button>
        </div>

        {/* Document Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {documents.map((doc) => {
            const isSelected = currentDoc?.id === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocForViewer(doc)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-900/30 border-brand-500/60 shadow-lg shadow-brand-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate">
                    <p className="font-semibold text-xs text-slate-100 truncate">{doc.filename}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                      {doc.docType.replace(/_/g, ' ')} • {doc.pageCount} pages
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold border ${
                      doc.acceptanceState === 'lender_accepted'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {doc.acceptanceState}
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>SHA256: {doc.sha256Digest.substring(0, 10)}...</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Eye className="w-3 h-3 text-brand-400" /> Inspect
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Document & OCR Preview Panel */}
      <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col h-full overflow-hidden">
        {currentDoc ? (
          <>
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  {currentDoc.filename}
                  <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono">
                    {currentDoc.docType}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Storage Key: {currentDoc.storageKey}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md font-mono flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Malware Scanned
                </span>
              </div>
            </div>

            {/* Document Content Box */}
            <div className="flex-1 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
              {/* Visual Page Simulation with Bounding Box Overlay */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 relative overflow-auto flex flex-col items-center justify-center">
                <div className="w-full max-w-sm aspect-[1/1.4] bg-slate-900 border border-slate-700/80 rounded-lg p-6 relative shadow-2xl flex flex-col justify-between font-mono text-[11px] text-slate-300">
                  <div className="border-b border-slate-700 pb-3 flex justify-between items-center text-slate-400">
                    <span className="font-bold text-white">CONFIDENTIAL DOCUMENT</span>
                    <span>PAGE 1 OF {currentDoc.pageCount}</span>
                  </div>

                  <div className="space-y-3 my-4">
                    <p className="font-bold text-slate-200">
                      ENTITY: METRO APEX HOLDINGS LLC
                    </p>
                    <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                      <p className="text-slate-400">FORM 1120-S LINE 21 ORDINARY INCOME:</p>
                      <p className="text-emerald-400 font-bold text-sm">$585,000.00 USD</p>
                    </div>

                    <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                      <p className="text-slate-400">EXISTING MONTHLY DEBT SERVICE:</p>
                      <p className="text-brand-300 font-bold text-xs">$12,400.00 USD / MO</p>
                    </div>

                    <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                      <p className="text-slate-400">APPRAISED FAIR MARKET VALUE:</p>
                      <p className="text-purple-300 font-bold text-xs">$6,200,000.00 USD</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-2 text-[10px] text-slate-500 flex justify-between">
                    <span>DIGEST: {currentDoc.sha256Digest.substring(0, 16)}</span>
                    <span>CONFIDENCE: 98%</span>
                  </div>

                  {/* Bounding Box Highlight Overlay */}
                  {highlightedRegion && (
                    <div
                      className="absolute border-2 border-brand-400 bg-brand-500/20 rounded glow-active pointer-events-none flex items-center justify-center"
                      style={{
                        top: `${highlightedRegion.y}px`,
                        left: `${highlightedRegion.x}px`,
                        width: `${highlightedRegion.width}px`,
                        height: `${highlightedRegion.height}px`,
                      }}
                    >
                      <span className="text-[9px] font-bold bg-brand-500 text-white px-1 rounded -top-4 absolute">
                        Evidence Bounding Box
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* OCR Text Stream & Extracted Metadata */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-y-auto flex flex-col font-mono">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5 text-brand-400">
                    <Layers className="w-3.5 h-3.5" /> OCR & Text Extract
                  </span>
                  <span className="text-[10px] text-slate-500">Provider: Azure Doc Intelligence</span>
                </div>

                <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono flex-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  {currentDoc.ocrTextPreview || 'No OCR preview text available.'}
                </pre>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a document to inspect OCR text and source region evidence.
          </div>
        )}
      </div>

      {/* Simulated Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Simulate Document Intake</h3>
            <form onSubmit={handleSimulatedUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Filename
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 2024_Form_1040_Guarantor.pdf"
                  value={uploadFilename}
                  onChange={(e) => setUploadFilename(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Classification Type
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="tax_return">Tax Return (1120-S / 1040)</option>
                  <option value="operating_statement">Operating P&L Statement</option>
                  <option value="rent_roll">Commercial Rent Roll</option>
                  <option value="personal_financial_statement">Personal Financial Statement</option>
                  <option value="appraisal">Appraisal Report</option>
                  <option value="bank_statement">Bank Statement</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
                >
                  Intake File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
