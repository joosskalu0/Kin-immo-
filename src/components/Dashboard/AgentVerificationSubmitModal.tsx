import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { VerificationDocument } from '../../types';
import {
  ShieldCheck,
  Award,
  Upload,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Building2,
  Clock,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentVerificationSubmitModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, agents, submitAgentVerificationDocuments } = useApp();

  const currentAgent = agents.find(
    (a) =>
      a.id === user?.agentId ||
      a.id === user?.id ||
      (user?.email && a.email?.toLowerCase() === user.email.toLowerCase())
  );

  const [docType, setDocType] = useState<'passport' | 'voter_card' | 'cni' | 'rccm' | 'professional_card'>('passport');
  const [docNumber, setDocNumber] = useState(user?.identityDocNumber || currentAgent?.identityDocNumber || '');
  const [rccmNumber, setRccmNumber] = useState(user?.rccmOrNif || currentAgent?.rccmOrNif || '');
  const [docTitle, setDocTitle] = useState('Passeport Biométrique Ordinaire RD Congo');
  const [docUrl, setDocUrl] = useState('https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const isAlreadyVerified = user?.isVerified || currentAgent?.isVerified;
  const isPending = user?.verificationStatus === 'pending' || currentAgent?.verificationStatus === 'pending';
  const isRejected = user?.verificationStatus === 'rejected' || currentAgent?.verificationStatus === 'rejected';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    const targetId = user.agentId || user.id || currentAgent?.id || `agent_${Date.now()}`;
    const newDocs: VerificationDocument[] = [
      {
        id: `doc_${Date.now()}`,
        type: docType,
        title: docTitle,
        documentNumber: docNumber || (docType === 'passport' ? 'OB-8829410-CD' : '1029-4820-9182-84'),
        fileName: `${docType}_officiel_${user.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        fileSize: '3.2 MB',
        fileUrl: docUrl,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
      },
    ];

    if (rccmNumber) {
      newDocs.push({
        id: `doc_rccm_${Date.now()}`,
        type: 'rccm',
        title: 'Attestation RCCM & NIF Guichet Unique',
        documentNumber: rccmNumber,
        fileName: `rccm_${rccmNumber.replace(/\//g, '_')}.pdf`,
        fileSize: '2.1 MB',
        fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
        uploadedAt: new Date().toISOString(),
        status: 'pending',
      });
    }

    setTimeout(() => {
      submitAgentVerificationDocuments(targetId, newDocs, docType, docNumber, rccmNumber);
      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        onClose();
      }, 2500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 relative shadow-2xl text-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <Award className="w-3 h-3" /> Certification Pro Kinshasa
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Obtenir le Badge « Agent Vérifié »
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Soumettez vos justificatifs officiels pour validation manuelle par la direction Immocraft RDC.
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {isAlreadyVerified && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-emerald-400">Votre compte est déjà 100% Vérifié & Certifié !</p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Le badge « Agent Vérifié » est actif sur votre profil public et toutes vos annonces. Vous pouvez soumettre de nouveaux documents si nécessaire.
              </p>
            </div>
          </div>
        )}

        {isPending && !submittedSuccess && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <p className="font-bold text-amber-400">Dossier en cours d'audit administratif</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Vos pièces d'identité ont bien été transmises. Notre équipe audite votre dossier sous 24h à 48h.
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Dossier Précédemment Refusé :</span>
            </div>
            <p className="text-[11px] leading-relaxed pl-6">
              {user?.rejectionReason || currentAgent?.rejectionReason || 'Documents illisibles ou expirés. Veuillez transmettre des pièces à jour.'}
            </p>
          </div>
        )}

        {submittedSuccess ? (
          <div className="p-8 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">Documents transmis avec succès !</h4>
            <p className="text-xs text-emerald-300">
              L'administrateur a été notifié. Votre badge sera activé dès la vérification manuelle validée.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Document Type Selector */}
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">
                Type de Pièce d'Identité Principale *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'passport', label: '🛂 Passeport RDC', title: 'Passeport Biométrique Ordinaire RD Congo' },
                  { id: 'voter_card', label: '🗳️ Carte d\'Électeur (CENI)', title: 'Carte d\'Électeur Officielle CENI RDC' },
                  { id: 'cni', label: '🪪 Carte d\'Identité (CNI)', title: 'Carte Nationale d\'Identité (CNI / ONIP RDC)' },
                  { id: 'rccm', label: '📜 Extrait RCCM & NIF', title: 'Certificat RCCM & NIF Guichet Unique' },
                  { id: 'professional_card', label: '💼 Carte Professionnelle', title: 'Carte Professionnelle Agent Immobilier' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDocType(item.id as any);
                      setDocTitle(item.title);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                      docType === item.id
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 ring-1 ring-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>En RDC, le <strong>Passeport Biométrique</strong> ou la <strong>Carte d'Électeur CENI</strong> sont les pièces officielles requises.</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Numéro de la Pièce ({docType === 'passport' ? 'N° Passeport' : docType === 'voter_card' ? 'N° Carte d\'Électeur' : 'N° Document'}) *
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder={docType === 'passport' ? 'Ex: OB-8829410-CD' : docType === 'voter_card' ? 'Ex: 1029-4820-9182-84' : 'Ex: CD-KIN-8821-2025'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Numéro RCCM / NIF Guichet Unique (si applicable)
                </label>
                <input
                  type="text"
                  value={rccmNumber}
                  onChange={(e) => setRccmNumber(e.target.value)}
                  placeholder="Ex: CD/KIN/RCCM/20-B-04921"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Document Image URL / Upload Simulation */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Fichier Justificatif (Scanné Recto/Verso ou Photo HD)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Demo Previews */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Échantillons types RDC pour test rapide :
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDocType('passport');
                    setDocTitle('Passeport Biométrique Ordinaire RD Congo');
                    setDocNumber('OB-8829410-CD');
                    setRccmNumber('CD/KIN/RCCM/22-A-1104');
                    setDocUrl('https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80');
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-emerald-300 border border-slate-700 font-semibold"
                >
                  🛂 Passeport RDC
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocType('voter_card');
                    setDocTitle('Carte d\'Électeur Officielle CENI RDC');
                    setDocNumber('1029-4820-9182-84');
                    setRccmNumber('CD/KIN/RCCM/20-B-04921');
                    setDocUrl('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80');
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-amber-300 border border-slate-700 font-semibold"
                >
                  🗳️ Carte d'Électeur CENI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocType('cni');
                    setDocTitle('Carte Nationale d\'Identité (CNI / ONIP RDC)');
                    setDocNumber('CD-KIN-9842-2025-AGENT');
                    setRccmNumber('CD/KIN/RCCM/20-B-04921');
                    setDocUrl('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80');
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
                >
                  🪪 CNI ONIP
                </button>
              </div>
            </div>

            {/* Guarantees Box */}
            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Protection et Confidentialité des Données</span>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Vos pièces d'identité ne sont accessibles qu'aux administrateurs habilités pour la conformité et ne sont jamais publiées publiquement.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>{isSubmitting ? 'Transmission en cours...' : 'Soumettre mon Dossier d\'Audit'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
