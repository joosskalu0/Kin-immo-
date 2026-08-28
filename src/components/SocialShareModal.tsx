import React, { useState } from 'react';
import { Property } from '../types';
import {
  X,
  Copy,
  Check,
  Mail,
  Share2,
  Send,
  QrCode,
  Smartphone,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { convertAndFormatPrice } from '../utils/currency';
import { trackSocialShare } from '../utils/analytics';
import { buildPropertyShareUrl, formatPropertyPitch } from '../utils/shareUtils';

interface SocialShareModalProps {
  property: Property | null;
  onClose: () => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ property, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'networks' | 'pitch' | 'qr'>('networks');

  if (!property) return null;

  const currentUrl = buildPropertyShareUrl(property.id);
  const formattedPrice = convertAndFormatPrice(property.price, 'USD');

  // Formatted pitch for social networks and WhatsApp groups
  const fullPitchText = formatPropertyPitch(property, currentUrl, formattedPrice);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    trackSocialShare('clipboard_link', property.title);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(fullPitchText);
    setCopiedPitch(true);
    trackSocialShare('clipboard_pitch', property.title);
    setTimeout(() => setCopiedPitch(false), 3000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Découvrez ce bien immobilier : ${property.title} (${formattedPrice})`,
          url: currentUrl,
        });
        trackSocialShare('native_share', property.title);
      } catch (e) {
        // Share cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Annonce Immobilière : ${property.title}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite vous partager cette offre immobilière disponible à Kinshasa :\n\n` +
      `Titre : ${property.title}\nPrix : ${formattedPrice}\nLocalisation : ${property.commune || property.city}\n\n` +
      `Lien de l'annonce : ${currentUrl}\n\nCordialement.`
    );
    window.location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;
    setEmailSent(true);
    trackSocialShare('email', property.title);
    setTimeout(() => {
      setEmailSent(false);
      onClose();
    }, 2000);
  };

  // QR Code URL using high-speed reliable QR generation API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-7 relative shadow-2xl text-slate-100 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-2xl hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Property Mini-Preview */}
        <div className="flex items-center gap-3.5 mb-5 pr-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-emerald-500/30 shadow-md relative">
            <img
              src={property.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300'}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30">
                {property.category === 'sale' ? 'Vente' : 'Location'}
              </span>
              <span className="text-xs font-bold text-emerald-400">{formattedPrice}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
              {property.title}
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {property.commune || property.city}, {property.quartier || 'Kinshasa'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-semibold mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('networks')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'networks'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Réseaux</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pitch')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pitch'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Texte Annonce</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>
        </div>

        {/* TAB 1: SOCIAL NETWORKS */}
        {activeTab === 'networks' && (
          <div className="space-y-4">
            {/* Primary Social Networks Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `🏡 *${property.title}* (${formattedPrice})\n📍 ${property.commune || property.city}\n👉 Découvrir la visite & photos : ${currentUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialShare('whatsapp', property.title)}
                className="p-3 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] group text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.983.538 1.905.82 2.8.82 3.182 0 5.768-2.587 5.768-5.767.001-3.18-2.584-5.765-5.772-5.765zm0-2.172c4.382 0 7.937 3.555 7.938 7.937 0 4.382-3.555 7.938-7.938 7.938-1.341 0-2.6-.339-3.712-.932l-4.319 1.133 1.154-4.212c-.663-1.168-1.061-2.52-1.061-3.927 0-4.382 3.556-7.937 7.938-7.937zm3.847 11.233c-.161.453-.807.828-1.127.879-.32.05-.72.073-2.135-.515-1.782-.74-2.92-2.56-3.009-2.679-.089-.119-.719-.958-.719-1.825 0-.867.453-1.294.614-1.471.161-.177.352-.222.469-.222.117 0 .234 0 .337.005.108.006.252-.041.394.3.147.354.5 1.218.544 1.307.044.089.073.193.015.308-.059.115-.088.188-.176.29-.088.103-.186.23-.265.309-.089.088-.182.185-.078.363.104.177.461.761 1.018 1.258.718.639 1.323.837 1.51.929.186.093.296.079.407-.049.112-.128.479-.559.607-.751.128-.192.256-.16.427-.096.171.064 1.085.511 1.271.603.186.092.311.138.356.216.046.077.046.452-.115.905z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white">WhatsApp</span>
                <span className="text-[10px] text-[#25D366] font-medium">Recommandé</span>
              </a>

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialShare('facebook', property.title)}
                className="p-3 rounded-2xl bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/40 text-[#1877F2] flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] group text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-lg shadow-[#1877F2]/20">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.6 5H18V0h-3.808C10.595 0 9 1.582 9 4.615V8z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white">Facebook</span>
                <span className="text-[10px] text-slate-400">Fil / Groupes</span>
              </a>

              {/* Twitter / X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `🏡 Découvrez cette opportunité immobilière à Kinshasa : ${property.title} (${formattedPrice})`
                )}&url=${encodeURIComponent(currentUrl)}&hashtags=Immobilier,Kinshasa,RDC,ImmoCraft`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialShare('twitter_x', property.title)}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] group text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-black border border-slate-700 text-white flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white">Twitter / X</span>
                <span className="text-[10px] text-slate-400">Post public</span>
              </a>

              {/* LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialShare('linkedin', property.title)}
                className="p-3 rounded-2xl bg-[#0A66C2]/15 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/40 text-[#0A66C2] flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] group text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shadow-lg shadow-[#0A66C2]/20">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white">LinkedIn</span>
                <span className="text-[10px] text-slate-400">Réseau PRO</span>
              </a>

              {/* Telegram */}
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(
                  `🏡 ${property.title} à Kinshasa (${formattedPrice})`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialShare('telegram', property.title)}
                className="p-3 rounded-2xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/40 text-[#229ED9] flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] group text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shadow-lg shadow-[#229ED9]/20">
                  <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.989z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white">Telegram</span>
                <span className="text-[10px] text-slate-400">Canal / Groupe</span>
              </a>

              {/* SMS / Mobile */}
              <a
                href={`sms:?&body=${encodeURIComponent(
                  `Regarde ce bien immobilier à Kinshasa : ${property.title} (${formattedPrice}) ${currentUrl}`
                )}`}
                onClick={() => trackSocialShare('sms', property.title)}
                className="p-3 rounded-2xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/40 text-violet-400 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] group text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/20">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">SMS</span>
                <span className="text-[10px] text-slate-400">Message direct</span>
              </a>

              {/* Native System Share (Android / iOS) */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-400 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] group text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">Appareil</span>
                <span className="text-[10px] text-emerald-400">Partage natif</span>
              </button>

              {/* Email Client */}
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  `Annonce Immobilière : ${property.title}`
                )}&body=${encodeURIComponent(
                  `Bonjour,\n\nDécouvrez cette propriété à Kinshasa :\n${property.title} (${formattedPrice})\n\nLien complet : ${currentUrl}`
                )}`}
                onClick={() => trackSocialShare('mailto', property.title)}
                className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.03] group text-center"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-lg">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-white">E-mail</span>
                <span className="text-[10px] text-slate-400">Mailto direct</span>
              </a>
            </div>

            {/* Quick Copy Direct Link */}
            <div className="pt-3 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Copier le lien direct de l'annonce</span>
                <span className="text-[10px] text-slate-400 font-mono">Prêt pour le Web</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500 select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
            </div>

            {/* Send By Email Direct Form */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-400" />
                Envoyer directement à un client / proche par e-mail
              </label>

              {emailSent ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  E-mail préparé et envoyé avec succès !
                </div>
              ) : (
                <form onSubmit={handleSendEmail} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="ex: client@gmail.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors border border-slate-700"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Envoyer</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: READY-TO-PASTE TEXT PITCH */}
        {activeTab === 'pitch' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Texte formaté pour groupes WhatsApp & statuts Facebook :
              </span>
              <button
                onClick={handleCopyPitch}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
              >
                {copiedPitch ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPitch ? 'Copié !' : 'Copier tout le texte'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {fullPitchText}
              </pre>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Astuce Pro :</strong> Collez ce texte directement dans vos groupes WhatsApp, canaux Telegram ou pages Facebook pour une diffusion instantanée et soignée avec tous les détails.
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: QR CODE GENERATOR */}
        {activeTab === 'qr' && (
          <div className="text-center space-y-4 py-2">
            <p className="text-xs text-slate-300">
              Scannez ce QR Code avec un smartphone pour ouvrir instantanément l'annonce et sa visite vidéo.
            </p>

            <div className="w-52 h-52 mx-auto bg-white p-3 rounded-3xl shadow-2xl border-4 border-emerald-500/40 flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt={`QR Code ${property.title}`}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-center gap-2">
              <a
                href={qrCodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`QR_${property.title.slice(0, 15)}.png`}
                className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                Télécharger le QR Code
              </a>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Lien copié' : 'Copier le lien'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
