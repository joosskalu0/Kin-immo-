import React, { useState, useEffect } from 'react';
import { AdSenseConfig } from '../../types';
import { mysqlApi } from '../../services/mysqlApi';
import { Sparkles, Settings2, ExternalLink, Check, AlertCircle, Info } from 'lucide-react';

interface GoogleAdSenseUnitProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  layout?: 'banner' | 'in_feed' | 'sidebar' | 'billboard';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const GoogleAdSenseUnit: React.FC<GoogleAdSenseUnitProps> = ({
  slot,
  format = 'auto',
  layout = 'in_feed',
  className = ''
}) => {
  const [config, setConfig] = useState<AdSenseConfig>(mysqlApi.getAdSenseConfig());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tempClientId, setTempClientId] = useState(config.clientId || '');
  const [tempSlotId, setTempSlotId] = useState(slot || config.slotHero || '');
  const [adLoaded, setAdLoaded] = useState(false);
  const [hasScriptError, setHasScriptError] = useState(false);

  useEffect(() => {
    // Écouter les mises à jour de configuration
    const handleConfigChange = () => {
      setConfig(mysqlApi.getAdSenseConfig());
    };
    window.addEventListener('adsense_config_updated', handleConfigChange);
    return () => window.removeEventListener('adsense_config_updated', handleConfigChange);
  }, []);

  // Déterminer le slot à utiliser
  const activeSlot = slot || (
    layout === 'banner' || layout === 'billboard' ? config.slotHero :
    layout === 'in_feed' ? config.slotInFeed :
    layout === 'sidebar' ? config.slotSidebar :
    config.slotFooter
  ) || '1234567890';

  const isLivePublisherReady = Boolean(
    config.clientId &&
    !config.clientId.includes('1234567890') &&
    !config.clientId.includes('0000') &&
    /^ca-pub-\d{10,}$/.test(config.clientId.trim())
  );

  // Injecter le script officiel Google AdSense UNIQUEMENT si un ID éditeur réel est configuré
  useEffect(() => {
    if (!isLivePublisherReady) {
      setAdLoaded(true);
      return;
    }

    const scriptId = 'google-adsense-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.clientId)}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        try {
          if (window.adsbygoogle) {
            window.adsbygoogle.push({});
          }
          setAdLoaded(true);
        } catch (e) {
          // ignore duplicate push
        }
      };
      script.onerror = () => {
        setHasScriptError(true);
      };
      document.head.appendChild(script);
    } else {
      try {
        if (window.adsbygoogle) {
          window.adsbygoogle.push({});
        }
        setAdLoaded(true);
      } catch (e) {
        // ignore duplicate push
      }
    }
  }, [config.clientId, activeSlot, isLivePublisherReady]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AdSenseConfig = {
      ...config,
      enabled: true,
      clientId: tempClientId.trim() || 'ca-pub-1234567890123456',
      slotHero: tempSlotId.trim() || config.slotHero,
      displayMode: 'adsense'
    };
    mysqlApi.updateAdSenseConfig(updated);
    setConfig(updated);
    setIsConfigModalOpen(false);
    window.dispatchEvent(new Event('adsense_config_updated'));
  };

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-sm transition-all ${className}`}>
        {/* Header Bar Google AdSense */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="font-bold text-slate-800 uppercase tracking-wider">Pancarte Google AdSense</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">
              Espace Publicitaire Dédié
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="text-slate-600 hover:text-blue-600 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              title="Configurer l'ID Éditeur Google AdSense (ca-pub-...)"
            >
              <Settings2 className="w-3 h-3" />
              <span className="hidden sm:inline">Paramètres AdSense</span>
            </button>
          </div>
        </div>

        {/* AdSense Live Unit / Realistic Preview Unit */}
        <div className="p-3 sm:p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[110px]">
          {isLivePublisherReady && !hasScriptError ? (
            <div className="w-full text-center">
              <ins
                className="adsbygoogle"
                style={{ display: 'block', minHeight: '90px' }}
                data-ad-client={config.clientId}
                data-ad-slot={activeSlot}
                data-ad-format={format}
                data-full-width-responsive="true"
              />
            </div>
          ) : (
            /* Responsive Modern AdSense Mock / Preview Showcase */
            <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      Annonce Sponsorisée Google
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Slot: {activeSlot}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                    Solutions Immobilières & Matériaux de Construction Kinshasa
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    Annonce ciblée par Google pour l'immobilier, l'habitat et le financement à Kinshasa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Insérer mon ID (ca-pub-...)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Small AdSense Footer Label */}
        <div className="px-3 py-1 bg-slate-100/70 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
          <span>Format: {layout === 'in_feed' ? 'Pancarte In-Feed Native' : 'Bannière Responsive'}</span>
          <span>Google AdSense Réseau Display RDC</span>
        </div>
      </div>

      {/* Modal de Configuration Google AdSense */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  Régie Monétisation
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  Configuration Google AdSense
                </h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-700" />
                  Comment diffuser vos annonces Google AdSense :
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Entrez votre <strong>Identifiant Éditeur Google (Publisher ID)</strong> au format <code className="bg-blue-100 px-1 rounded">ca-pub-XXXXXXXXXXXXXXXX</code> et le <strong>Slot ID</strong> généré dans votre console Google AdSense.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ID Éditeur Google AdSense (Client ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: ca-pub-1234567890123456"
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Disponible dans votre compte AdSense &gt; Paramètres &gt; Compte.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Slot ID d'Annonce (Unité publicitaire)
                </label>
                <input
                  type="text"
                  placeholder="ex: 9876543210"
                  value={tempSlotId}
                  onChange={(e) => setTempSlotId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Identifiant de votre bloc d'annonces responsive créé sur Google AdSense.
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer et Diffuser AdSense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
