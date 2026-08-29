import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserPlus,
  Copy,
  Check,
  Share2,
  Mail,
  Building2,
  BadgeCheck,
  Sparkles,
  ShieldCheck,
  Send,
  Users,
  QrCode,
  ExternalLink,
  MessageCircle
} from 'lucide-react';

export const AgentInviteManager: React.FC = () => {
  const { user } = useApp();
  const [inviteType, setInviteType] = useState<'agent' | 'agency'>('agent');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const senderName = user?.agencyName || user?.name || 'Immocraft Kinshasa';
  const senderId = user?.agentId || user?.id || 'partenaire';

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://immocraft.cd';
  const inviteUrl = `${baseUrl}/?invite=${inviteType}&ref=${encodeURIComponent(senderName)}&refId=${encodeURIComponent(senderId)}`;

  const shareText = `Bonjour ! Rejoignez notre réseau de professionnels de l'immobilier agréés sur Immocraft Kinshasa. Inscrivez-vous gratuitement via ce lien sécurisé pour publier vos biens immobiliers à Kinshasa :\n${inviteUrl}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Invitation à rejoindre Immocraft Kinshasa de la part de ${senderName}`);
    const body = encodeURIComponent(
      `Bonjour,\n\n${senderName} vous invite cordialement à rejoindre le réseau professionnel Immocraft Kinshasa.\n\nEn créant votre compte vérifié, vous pourrez publier vos biens immobiliers et développer votre portefeuille à Kinshasa (Gombe, Ngaliema, Limete, etc.).\n\nCliquez sur le lien suivant pour vous inscrire gratuitement via Google ou vos identifiants :\n${inviteUrl}\n\nCordialement,\n${senderName}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-slate-100 shadow-xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">Inviter des Agents & Agences Partenaires</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Lien Officiel
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Partagez votre lien d'invitation personnalisé. Toute nouvelle inscription est directement gérée par Google & Firebase Authentication.
            </p>
          </div>
        </div>

        {/* Sender Identity Pill */}
        <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-left">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Invité par :</span>
            <span className="font-bold text-white truncate block max-w-[180px]">{senderName}</span>
          </div>
        </div>
      </div>

      {/* Target Role Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-300">
          Choisissez le type d'invitation à générer :
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setInviteType('agent')}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
              inviteType === 'agent'
                ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${inviteType === 'agent' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                Inviter un Agent Immobilier
                {inviteType === 'agent' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Idéal pour recruter des négociateurs, courtiers et agents indépendants dans votre équipe ou réseau.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setInviteType('agency')}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
              inviteType === 'agency'
                ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${inviteType === 'agency' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-1.5">
                Inviter une Agence / Cabinet
                {inviteType === 'agency' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pour les agences immobilières légitimes avec RCCM/NIF et équipes de gestionnaires à Kinshasa.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Generated Link Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Lien d'invitation sécurisé ({inviteType === 'agency' ? 'Agence' : 'Agent'})
          </span>
          <span className="text-[10px] text-emerald-400 font-medium">
            Prêt à partager
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 break-all select-all flex items-center gap-2">
            <span className="truncate">{inviteUrl}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Lien Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copier le Lien</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Direct Social Share Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="p-3.5 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Partager sur WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleEmailShare}
          className="p-3.5 rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-400 font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Mail className="w-4 h-4" />
          <span>Envoyer par E-mail</span>
        </button>

        <button
          type="button"
          onClick={() => setShowQr(!showQr)}
          className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>{showQr ? 'Masquer QR Code' : 'Afficher QR Code'}</span>
        </button>
      </div>

      {/* QR Code Expansion */}
      {showQr && (
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 animate-fadeIn">
          <div className="inline-block p-4 bg-white rounded-2xl shadow-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}`}
              alt="QR Code Invitation"
              className="w-44 h-44 mx-auto"
            />
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Faites scanner ce QR code lors de vos réunions à Kinshasa pour une inscription instantanée.
          </p>
        </div>
      )}

      {/* Firebase & Security Guarantees */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-white font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Sécurité et Architecture Firebase & Google Authentification</span>
        </div>
        <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-400 pl-1">
          <li>
            <strong className="text-slate-200">Google Authentification & Firebase Auth :</strong> Les utilisateurs peuvent s'inscrire en 1 clic via leur compte Google officiel ou par e-mail / téléphone.
          </li>
          <li>
            <strong className="text-slate-200">Aucun mot de passe dans Firestore :</strong> Les mots de passe sont exclusivement hachés et sécurisés par l'infrastructure Firebase Authentication.
          </li>
          <li>
            <strong className="text-slate-200">Firestore en base de données centrale :</strong> L'ID, le nom, le numéro de téléphone, l'adresse e-mail et le rôle sont synchronisés en temps réel dans Firestore.
          </li>
          <li>
            <strong className="text-slate-200">Zéro stockage local non sécurisé :</strong> Les données sont persistées directement dans Firebase sans dépendance au stockage du navigateur.
          </li>
        </ul>
      </div>
    </div>
  );
};
