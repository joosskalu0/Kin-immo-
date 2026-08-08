import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Agent, Agency } from '../types';
import { Search, Star, Phone, Mail, MessageSquare, Building2, ShieldCheck, Check } from 'lucide-react';

export const AgentDirectory: React.FC = () => {
  const { agents, agencies, properties, setActivePropertyModalId } = useApp();
  const [activeTab, setActiveTab] = useState<'agents' | 'agencies'>('agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactAgentModal, setContactAgentModal] = useState<Agent | null>(null);
  const [messageSent, setMessageSent] = useState(false);

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.agencyName && a.agencyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setMessageSent(true);
    setTimeout(() => {
      setMessageSent(false);
      setContactAgentModal(null);
    }, 2500);
  };

  return (
    <div className="space-y-8">
      {/* Directory Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Annuaire PRO Agents & Agences
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Des Experts Immobiliers à votre Service
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Trouvez les meilleurs agents et agences spécialisés dans le résidentiel de prestige, l'investissement ou la vente de propriétés.
          </p>

          {/* Search Bar */}
          <div className="pt-2 flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, ville ou spécialité..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('agents')}
          className={`py-3 px-4 border-b-2 transition-all ${
            activeTab === 'agents'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Agents Immobiliers ({filteredAgents.length})
        </button>
        <button
          onClick={() => setActiveTab('agencies')}
          className={`py-3 px-4 border-b-2 transition-all ${
            activeTab === 'agencies'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Agences Partenaires ({agencies.length})
        </button>
      </div>

      {/* Agents Cards Grid */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => {
            const agentListings = properties.filter((p) => p.agentId === agent.id);

            return (
              <div
                key={agent.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  {/* Top Profile */}
                  <div className="flex items-start gap-4">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold mb-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{agent.rating}</span>
                        <span className="text-slate-500 font-normal">({agent.reviewCount} avis)</span>
                      </div>
                      <h3 className="font-bold text-white text-base">{agent.name}</h3>
                      <p className="text-xs text-emerald-400 font-medium">{agent.title}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {agent.agencyName}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                    "{agent.bio}"
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1.5">
                    {agent.specialties.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Stats & Contact */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">
                    <strong className="text-white font-bold">{agentListings.length}</strong> annonces actives
                  </span>

                  <button
                    onClick={() => setContactAgentModal(agent)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-transform hover:scale-105 flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Contacter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agencies Grid */}
      {activeTab === 'agencies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agencies.map((agency) => (
            <div
              key={agency.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-start"
            >
              <img
                src={agency.logo}
                alt={agency.name}
                className="w-24 h-24 rounded-2xl object-cover ring-1 ring-slate-700 shrink-0"
              />
              <div className="space-y-2 text-xs flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">{agency.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Partenaire Certifié
                  </span>
                </div>
                <p className="text-slate-400">{agency.address}, {agency.city}</p>
                <p className="text-slate-300 leading-relaxed">{agency.description}</p>
                <div className="pt-2 text-slate-400 flex items-center gap-4">
                  <span>📞 {agency.phone}</span>
                  <span>👥 {agency.agentsCount} agents</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Agent Modal */}
      {contactAgentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-slate-100 space-y-4">
            <button
              onClick={() => setContactAgentModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <img
                src={contactAgentModal.avatar}
                alt={contactAgentModal.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
              />
              <div>
                <h4 className="font-bold text-white">{contactAgentModal.name}</h4>
                <p className="text-xs text-emerald-400 font-medium">{contactAgentModal.title}</p>
                <p className="text-[11px] text-slate-400">{contactAgentModal.phone}</p>
              </div>
            </div>

            {/* Quick WhatsApp & Call Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/${(contactAgentModal.whatsapp || contactAgentModal.phone || '+243810000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${contactAgentModal.name}, je vous contacte depuis Kin Immobilier pour une recherche de propriété.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>WhatsApp Direct</span>
              </a>

              <a
                href={`tel:${contactAgentModal.phone}`}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Appeler ({contactAgentModal.phone})</span>
              </a>
            </div>

            {messageSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-center font-bold text-xs">
                ✓ Message transmis directement à {contactAgentModal.name} !
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Votre nom complet"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="email"
                  required
                  placeholder="Votre e-mail"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  rows={4}
                  required
                  placeholder="Bonjour, je cherche une propriété à acheter/louer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:scale-[1.02] transition-transform"
                >
                  Envoyer le Message Direct
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
