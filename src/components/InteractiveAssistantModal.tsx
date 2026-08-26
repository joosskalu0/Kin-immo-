import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import {
  Sparkles,
  Bot,
  Send,
  X,
  MapPin,
  Building2,
  DollarSign,
  Calculator,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Phone,
  MessageCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Property } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  matchedProperties?: Property[];
  suggestedFilters?: {
    commune?: string;
    type?: string;
    status?: string;
    maxPrice?: number;
    amenities?: string[];
    customFields?: Record<string, any>;
  };
  actions?: Array<{
    label: string;
    action: () => void;
    icon?: any;
  }>;
}

interface InteractiveAssistantModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const InteractiveAssistantModal: React.FC<InteractiveAssistantModalProps> = ({
  isOpen: controlledIsOpen,
  onClose,
}) => {
  const {
    properties,
    setFilters,
    currency,
    setActivePropertyModalId,
    agents,
  } = useApp();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (onClose) onClose();
    setInternalIsOpen(false);
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Bonjour ! Je suis votre Conseiller Immobilier Virtuel pour Kinshasa & la RDC. Comment puis-je vous aider aujourd'hui ?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const samplePrompts = [
    {
      label: '🏖️ Villas avec piscine à Gombe ou Ngaliema',
      prompt: 'Je cherche une villa avec piscine à Gombe ou Ngaliema',
    },
    {
      label: '📜 Biens avec Titre Foncier Garanti',
      prompt: 'Quels biens possèdent un Certificat d\'Enregistrement garanti ?',
    },
    {
      label: '⚡ Biens 100% Autonomes (Solaire & Forage)',
      prompt: 'Montre-moi les biens avec autonomie solaire et forage d\'eau',
    },
    {
      label: '💰 Appartements à louer < 2000 $/mois',
      prompt: 'Je cherche un appartement à louer à moins de 2000 $ par mois',
    },
    {
      label: '🧮 Simuler un crédit immobilier',
      prompt: 'Comment calculer la mensualité d\'un crédit pour un bien de 250 000 $ ?',
    },
    {
      label: '📊 Comparer les prix Gombe vs Ngaliema',
      prompt: 'Quelle est la différence de prix et d\'ambiance entre Gombe et Ngaliema ?',
    },
  ];

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    setTimeout(() => {
      processAssistantResponse(query);
      setIsTyping(false);
    }, 600);
  };

  const processAssistantResponse = (query: string) => {
    const q = query.toLowerCase();
    let responseText = '';
    let matchedProps: Property[] = [];
    let suggestedFilters: any = null;

    // Detect Communes
    const isGombe = q.includes('gombe');
    const isNgaliema = q.includes('ngaliema') || q.includes('macampagne') || q.includes('binza');
    const isLimete = q.includes('limete');
    const isKintambo = q.includes('kintambo');
    const isMontNgafula = q.includes('ngafula');

    // Detect Keywords
    const hasPool = q.includes('piscine') || q.includes('pool');
    const hasSolar = q.includes('solaire') || q.includes('groupe') || q.includes('autonome') || q.includes('electricité') || q.includes('snel');
    const hasWater = q.includes('forage') || q.includes('eau') || q.includes('cuve') || q.includes('regideso');
    const hasTitre = q.includes('titre') || q.includes('certificat') || q.includes('enregistrement') || q.includes('foncier') || q.includes('notaire');
    const isRent = q.includes('louer') || q.includes('loyer') || q.includes('location');
    const isSale = q.includes('acheter') || q.includes('vente') || q.includes('achat') || q.includes('prix de vente');
    const isCredit = q.includes('credit') || q.includes('prêt') || q.includes('mensualité') || q.includes('emprunt') || q.includes('taux') || q.includes('banque') || q.includes('simuler');
    const isCompare = q.includes('comparer') || q.includes('difference') || q.includes('vs') || q.includes('quartier');

    if (isCredit) {
      // Mortgage calculation simulation
      const amountMatch = q.match(/\d+[\s\d]*/);
      const loanAmount = amountMatch ? parseInt(amountMatch[0].replace(/\s/g, ''), 10) : 200000;
      const rate = 0.085; // 8.5% annual rate
      const years = 15;
      const monthlyRate = rate / 12;
      const totalMonths = years * 12;
      const monthlyPayment = Math.round((loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths)));

      responseText = `Voici une simulation estimative pour un crédit immobilier en RDC (ex: Equity BCDC, Rawbank, TMB) :\n\n` +
        `• **Montant emprunté** : ${loanAmount.toLocaleString()} USD\n` +
        `• **Taux indicatif moyen** : ${(rate * 100).toFixed(1)}% / an\n` +
        `• **Durée** : ${years} ans (${totalMonths} mois)\n` +
        `• **Mensualité estimée** : ~ **${monthlyPayment.toLocaleString()} USD / mois**\n\n` +
        `*Conseil KIN IMMO : Prévoyez également environ 6% à 8% pour les droits d'enregistrement, frais de notaire et mutation du Certificat d'Enregistrement.*`;
    } else if (isCompare) {
      responseText = `**Comparatif Gombe vs Ngaliema (Kinshasa) :**\n\n` +
        `🏢 **Gombe (Centre des Affaires & Ambassades)** :\n` +
        `• Loyer moyen : 2 500$ à 6 000$/mois pour appartements de standing.\n` +
        `• Idéal pour : diplomates, cadres supérieurs, proximité des ministères et restaurants chics.\n\n` +
        `🌿 **Ngaliema (Macampagne, Mont-Fleury, Binza)** :\n` +
        `• Cadre verdoyant, grandes villas avec jardins privatifs et piscines.\n` +
        `• Calme résidentiel, très recherché par les familles.\n` +
        `• Prix d'achat villa : de 350 000$ à plus de 1 500 000$.\n\n` +
        `Souhaitez-vous voir les biens disponibles dans l'un de ces quartiers ?`;
    } else {
      // Find matching properties
      matchedProps = properties.filter((p) => {
        let match = true;
        if (isGombe && !p.commune?.toLowerCase().includes('gombe') && !p.address?.toLowerCase().includes('gombe')) match = false;
        if (isNgaliema && !p.commune?.toLowerCase().includes('ngaliema') && !p.address?.toLowerCase().includes('ngaliema') && !p.quartier?.toLowerCase().includes('macampagne')) match = false;
        if (isLimete && !p.commune?.toLowerCase().includes('limete') && !p.address?.toLowerCase().includes('limete')) match = false;
        if (hasPool && !p.amenities?.includes('Piscine') && !p.description?.toLowerCase().includes('piscine')) match = false;
        if (hasSolar && !p.customFields?.solaire_groupe && !p.description?.toLowerCase().includes('solaire') && !p.description?.toLowerCase().includes('groupe')) match = false;
        if (hasWater && !p.customFields?.forage_eau && !p.description?.toLowerCase().includes('forage')) match = false;
        if (hasTitre && !p.customFields?.titre_foncier && !p.description?.toLowerCase().includes('titre foncier') && !p.description?.toLowerCase().includes('certificat')) match = false;
        if (isRent && p.status !== 'for-rent') match = false;
        if (isSale && p.status !== 'for-sale') match = false;
        return match;
      }).slice(0, 3);

      if (matchedProps.length > 0) {
        responseText = `J'ai trouvé **${matchedProps.length} bien(s)** correspondant parfaitement à vos critères sur Kinshasa :`;
        suggestedFilters = {
          commune: isGombe ? 'Gombe' : isNgaliema ? 'Ngaliema' : isLimete ? 'Limete' : undefined,
          status: isRent ? 'for-rent' : isSale ? 'for-sale' : undefined,
        };
      } else {
        // Fallback recommendations
        matchedProps = properties.slice(0, 2);
        responseText = `Je n'ai pas trouvé d'annonce correspondant exactement à l'ensemble de ces filtres combinés, mais voici nos meilleures recommandations d'exception actuelles :`;
      }
    }

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      sender: 'assistant',
      text: responseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      matchedProperties: matchedProps.length > 0 ? matchedProps : undefined,
      suggestedFilters: suggestedFilters,
    };

    setMessages((prev) => [...prev, assistantMsg]);
  };

  const handleToggle = () => {
    if (controlledIsOpen !== undefined) {
      if (isOpen) {
        if (onClose) onClose();
      }
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const applySuggestedFilters = (sf: any) => {
    if (!sf) return;
    setFilters((prev) => ({
      ...prev,
      commune: sf.commune || prev.commune,
      status: sf.status || prev.status,
    }));
    handleClose();
  };

  return (
    <>
      {/* Floating Trigger Button with Pulse (only when not controlled externally) */}
      {controlledIsOpen === undefined && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handleToggle}
            className="group relative px-4 py-3 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 border border-emerald-300/30"
            title="Ouvrir l'Assistant Immobilier Kinshasa"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950"></span>
            </span>

            <Bot className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            <span className="hidden sm:inline font-extrabold tracking-tight">Assistant Kin Immo</span>
            <span className="sm:hidden font-extrabold">Aide</span>
          </button>
        </div>
      )}

      {/* Assistant Modal Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 shadow-2xl flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden text-slate-100 ${
            isExpanded
              ? 'inset-4 sm:inset-10 max-w-5xl mx-auto'
              : 'bottom-20 right-4 sm:right-6 w-[95vw] sm:w-[440px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">Assistant Kin Immo</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30">
                    IA & Concierge
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Recherche, Prix, Titres & Visites à Kinshasa</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 hover:text-white rounded-lg hover:bg-slate-800 transition-colors hidden sm:block"
                title={isExpanded ? 'Réduire' : 'Agrandir'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="space-y-2 max-w-[85%]">
                  <div
                    className={`p-3 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {/* Matched Properties Cards inside conversation */}
                    {msg.matchedProperties && msg.matchedProperties.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        {msg.matchedProperties.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setActivePropertyModalId(p.id);
                            }}
                            className="group p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center gap-2.5"
                          >
                            <img
                              src={p.images[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'}
                              alt={p.title}
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white group-hover:text-emerald-400 truncate text-[11px]">
                                {p.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                                {p.commune || p.city || 'Kinshasa'}
                              </p>
                              <span className="text-[11px] font-extrabold text-emerald-400">
                                {convertAndFormatPrice(p.price, currency)}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        ))}

                        {msg.suggestedFilters && (
                          <button
                            onClick={() => applySuggestedFilters(msg.suggestedFilters)}
                            className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <span>🎯 Appliquer ces filtres au catalogue</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 px-1 block">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-slate-400 text-xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex gap-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {samplePrompts.map((sp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sp.prompt)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 hover:text-emerald-400 border border-slate-800 whitespace-nowrap transition-colors"
              >
                {sp.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Posez votre question sur un bien, commune, crédit..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
