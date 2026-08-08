import React, { useState } from 'react';
import { Property } from '../types';
import { X, Copy, Check, Mail, Share2, Send } from 'lucide-react';

interface SocialShareModalProps {
  property: Property | null;
  onClose: () => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ property, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  if (!property) return null;

  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSent(true);
    setTimeout(() => {
      setEmailSent(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-400 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-sky-500/20">
            <Share2 className="w-6 h-6 text-slate-950" />
          </div>
          <h3 className="text-lg font-bold text-white">Partager cette Propriété</h3>
          <p className="text-xs text-slate-400 line-clamp-1 mt-1">{property.title}</p>
        </div>

        {/* Social Network Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-6 text-xs font-semibold">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center gap-1 transition-transform hover:scale-105"
          >
            Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(property.title)}&url=${encodeURIComponent(currentUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-slate-950 hover:bg-black text-white border border-slate-800 flex flex-col items-center gap-1 transition-transform hover:scale-105"
          >
            Twitter/X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white flex flex-col items-center gap-1 transition-transform hover:scale-105"
          >
            LinkedIn
          </a>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(property.title + ' ' + currentUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center gap-1 transition-transform hover:scale-105"
          >
            WhatsApp
          </a>
        </div>

        {/* Copy Link */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Copier le lien direct
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>

          {/* Share via Email */}
          <div className="pt-4 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              Envoyer la fiche par e-mail
            </label>

            {emailSent ? (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs text-center font-bold">
                ✓ E-mail envoyé avec succès !
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="ami@domaine.fr"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" /> Envoyer
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
