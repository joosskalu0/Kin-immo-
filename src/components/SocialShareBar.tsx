import React, { useState } from 'react';
import { Property } from '../types';
import {
  Share2,
  Copy,
  Check,
  Smartphone,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { convertAndFormatPrice } from '../utils/currency';
import { trackSocialShare } from '../utils/analytics';
import { buildPropertyShareUrl } from '../utils/shareUtils';

interface SocialShareBarProps {
  property: Property;
  onOpenFullModal?: () => void;
  className?: string;
}

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  property,
  onOpenFullModal,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const currentUrl = property ? buildPropertyShareUrl(property.id) : '';
  const formattedPrice = convertAndFormatPrice(property.price, 'USD');

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      trackSocialShare('clipboard_bar', property.title);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Découvrez cette propriété à Kinshasa : ${property.title} (${formattedPrice})`,
          url: currentUrl,
        });
        trackSocialShare('native_share_bar', property.title);
      } catch (err) {
        // user closed sheet
      }
    } else if (onOpenFullModal) {
      onOpenFullModal();
    } else {
      handleCopy(e);
    }
  };

  const whatsappMessage = `🏡 *${property.title}* (${formattedPrice})\n📍 ${property.commune || property.city}\n👉 Découvrir la visite & photos : ${currentUrl}`;

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-md ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              Partager cette annonce
              <span className="text-[10px] text-emerald-400 font-semibold">• Réseaux Sociaux</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Diffusez ce bien à vos contacts, clients ou collaborateurs en 1 clic
            </p>
          </div>
        </div>

        {onOpenFullModal && (
          <button
            type="button"
            onClick={onOpenFullModal}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 self-start sm:self-center transition-colors"
          >
            <span>Toutes les options</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Social Network Icon Buttons Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* WhatsApp Button */}
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSocialShare('whatsapp_bar', property.title)}
          className="px-3 py-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
          title="Partager sur WhatsApp"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.983.538 1.905.82 2.8.82 3.182 0 5.768-2.587 5.768-5.767.001-3.18-2.584-5.765-5.772-5.765zm0-2.172c4.382 0 7.937 3.555 7.938 7.937 0 4.382-3.555 7.938-7.938 7.938-1.341 0-2.6-.339-3.712-.932l-4.319 1.133 1.154-4.212c-.663-1.168-1.061-2.52-1.061-3.927 0-4.382 3.556-7.937 7.938-7.937zm3.847 11.233c-.161.453-.807.828-1.127.879-.32.05-.72.073-2.135-.515-1.782-.74-2.92-2.56-3.009-2.679-.089-.119-.719-.958-.719-1.825 0-.867.453-1.294.614-1.471.161-.177.352-.222.469-.222.117 0 .234 0 .337.005.108.006.252-.041.394.3.147.354.5 1.218.544 1.307.044.089.073.193.015.308-.059.115-.088.188-.176.29-.088.103-.186.23-.265.309-.089.088-.182.185-.078.363.104.177.461.761 1.018 1.258.718.639 1.323.837 1.51.929.186.093.296.079.407-.049.112-.128.479-.559.607-.751.128-.192.256-.16.427-.096.171.064 1.085.511 1.271.603.186.092.311.138.356.216.046.077.046.452-.115.905z" />
          </svg>
          <span>WhatsApp</span>
        </a>

        {/* Facebook Button */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSocialShare('facebook_bar', property.title)}
          className="px-3 py-2 rounded-xl bg-[#1877F2]/20 hover:bg-[#1877F2]/30 text-[#1877F2] border border-[#1877F2]/40 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
          title="Partager sur Facebook"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.6 5H18V0h-3.808C10.595 0 9 1.582 9 4.615V8z" />
          </svg>
          <span>Facebook</span>
        </a>

        {/* Twitter / X Button */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `🏡 Opportunité immobilière : ${property.title} (${formattedPrice})`
          )}&url=${encodeURIComponent(currentUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSocialShare('twitter_x_bar', property.title)}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
          title="Partager sur X (Twitter)"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>X</span>
        </a>

        {/* LinkedIn Button */}
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSocialShare('linkedin_bar', property.title)}
          className="px-3 py-2 rounded-xl bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 text-[#0A66C2] border border-[#0A66C2]/40 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 hidden md:flex"
          title="Partager sur LinkedIn"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
          <span>LinkedIn</span>
        </a>

        {/* Telegram Button */}
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(
            `🏡 ${property.title} (${formattedPrice})`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSocialShare('telegram_bar', property.title)}
          className="px-3 py-2 rounded-xl bg-[#229ED9]/20 hover:bg-[#229ED9]/30 text-[#229ED9] border border-[#229ED9]/40 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 hidden sm:flex"
          title="Partager sur Telegram"
        >
          <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.989z" />
          </svg>
          <span>Telegram</span>
        </a>

        {/* Copy Link Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ml-auto"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Lien copié !' : 'Copier'}</span>
        </button>

        {/* Native Mobile Share Button */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center justify-center transition-all active:scale-95"
          title="Partage système smartphone"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
