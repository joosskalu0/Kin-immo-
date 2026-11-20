import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_FAQ_ITEMS } from '../../data/contentSeed';
import { FaqItem } from '../../types';
import { useApp } from '../../context/AppContext';

interface HelpFaqViewProps {
  onReturnHome: () => void;
  onOpenConciergerie: () => void;
}

const FAQ_CATEGORY_LABELS: Record<FaqItem['category'], string> = {
  acheteurs_locataires: 'Acheteurs & Locataires',
  proprietaires_agences: 'Propriétaires & Agences',
  paiements_plans: 'Mobile Money & Abonnements',
  securite_confiance: 'Sécurité & Kinimmo Trust',
  conciergerie: 'Conciergerie VIP',
};

export const HelpFaqView: React.FC<HelpFaqViewProps> = ({
  onReturnHome,
  onOpenConciergerie,
}) => {
  const { contactSettings } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<'all' | FaqItem['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string>(DEFAULT_FAQ_ITEMS[0]?.id || '');

  const filteredFaq = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DEFAULT_FAQ_ITEMS.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  const supportWhatsapp = (contactSettings?.supportWhatsApp || '+243845294616').replace(/[^0-9]/g, '');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Assistance Kinimmo RDC
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Centre d’aide & Questions fréquentes
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Réponses pratiques sur la recherche de biens à Kinshasa, les paiements Mobile Money, les QR codes panneaux et la vérification Kinimmo Trust.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnHome}
          className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour Accueil</span>
        </button>
      </div>

      {/* Barre recherche + catégories */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une question (ex : Mobile Money, QR code, visite, rétrogradation)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Toutes ({DEFAULT_FAQ_ITEMS.length})
          </button>
          {(Object.keys(FAQ_CATEGORY_LABELS) as FaqItem['category'][]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {FAQ_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Accordéon FAQ */}
      <div className="space-y-3">
        {filteredFaq.length > 0 ? (
          filteredFaq.map((item) => {
            const isOpen = openFaqId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? '' : item.id)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {FAQ_CATEGORY_LABELS[item.category]}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      {item.question}
                    </h2>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 max-w-2xl">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
            <HelpCircle className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-900">Aucune question ne correspond à votre recherche.</p>
          </div>
        )}
      </div>

      {/* Bloc contact direct */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <h2 className="text-lg font-extrabold">Besoin d’un accompagnement personnalisé ?</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Notre support à Kinshasa répond aux questions sur la facturation, la certification Kinimmo Trust et les recherches via la Conciergerie VIP.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <a
            href={`https://wa.me/${supportWhatsapp}?text=${encodeURIComponent(
              'Bonjour support Kinimmo, j’ai une question depuis le Centre d’aide.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Support WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={onOpenConciergerie}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Conciergerie VIP</span>
          </button>
        </div>
      </section>
    </div>
  );
};
