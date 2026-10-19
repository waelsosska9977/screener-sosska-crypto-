import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Terminal, ExternalLink, Archive } from 'lucide-react';
import { PYTHON_FILES, PythonFileItem } from '../services/pythonScripts';
import JSZip from 'jszip';

interface PythonStudioViewProps {
  onDownloadAllZip: () => void;
}

export const PythonStudioView: React.FC<PythonStudioViewProps> = ({ onDownloadAllZip }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentFile = PYTHON_FILES[selectedFileIndex] || PYTHON_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = currentFile.content.split('\n');

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">استوديو كود بايثون الجاهز للإنتاج (Production-Ready Code)</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              الكود البرمجي الكامل لسكريبت <code className="text-amber-300 font-mono">sosska1_scanner.py</code> مع ملفات التشغيل والخدمة المستمرة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ الكود'}</span>
          </button>

          <button
            onClick={handleDownloadSingle}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تحميل {currentFile.filename}</span>
          </button>

          <button
            onClick={onDownloadAllZip}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-colors shadow-sm"
          >
            <Archive className="w-4 h-4" />
            <span>تحميل الحزمة كاملة (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col shadow-2xl">
        
        {/* File Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-neutral-800 bg-neutral-950/80 px-2 pt-2 gap-1 no-scrollbar">
          {PYTHON_FILES.map((file, idx) => (
            <button
              key={file.filename}
              onClick={() => setSelectedFileIndex(idx)}
              className={`px-3 py-2 text-xs font-mono rounded-t-lg transition-colors whitespace-nowrap border-t border-x ${
                selectedFileIndex === idx
                  ? 'bg-neutral-900 text-amber-400 font-bold border-neutral-800 border-b-transparent'
                  : 'text-neutral-400 hover:text-white border-transparent'
              }`}
            >
              {file.filename}
            </button>
          ))}
        </div>

        {/* Current File Metadata Subheader */}
        <div className="px-6 py-2.5 bg-neutral-950/40 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span className="font-sans">{currentFile.description}</span>
          <span className="font-mono text-neutral-500 tabular-nums">{lines.length} سطر · {currentFile.language}</span>
        </div>

        {/* Code Content with Line Numbers */}
        <div className="overflow-x-auto max-h-[600px] p-4 bg-[#0a0c12] text-xs font-mono leading-relaxed select-text">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-neutral-800/30">
                  <td className="w-12 select-none text-right pr-4 text-neutral-600 tabular-nums font-mono border-r border-neutral-800/60">
                    {i + 1}
                  </td>
                  <td className="pl-4 whitespace-pre text-neutral-200">
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Run Terminal Strip */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
            <span>أمر التشغيل السريع على السيرفر:</span>
            <code className="bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800 text-amber-300 font-mono">
              python sosska1_scanner.py
            </code>
          </div>
          <span className="text-neutral-500 font-mono text-[11px]">
            يدعم باراميترات: --once, --dry-run, --test-telegram, --pairs
          </span>
        </div>

      </div>

    </div>
  );
};
