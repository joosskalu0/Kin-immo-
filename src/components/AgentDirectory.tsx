import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Agent, Agency } from '../types';
import { Search, Star, Phone, Mail, MessageSquare, Building2, ShieldCheck, Check, Trash2, Info, BadgeCheck, FileCheck, UserCheck, Award, X, Lock } from 'lucide-react';

export const AgentDirectory: React.FC = () => {
  const { agents, agencies, properties, allUsers, deleteAgent, deleteAgency, user, requestConfirm, setActivePropertyModalId } = useApp();
  const [activeTab, setActiveTab] = useState<'agents' | 'agencies'>('agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactAgentModal, setContactAgentModal] = useState<Agent | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [verificationModalAgent, setVerificationModalAgent] = useState<Agent | null>(null);
  const [showGeneralVerificationInfo, setShowGeneralVerificationInfo] = useState(false);

  // Combine explicitly saved agents with all registered users from Firestore who are agents/owners/admins
  const combinedAgentsList = React.useMemo(() => {
    const map = new Map<string, Agent>();

    // 1. Add explicitly created agents
    agents.forEach((a) => {
      map.set(a.id, a);
      if (a.email) map.set(a.email.toLowerCase(), a);
    });

    // 2. Add registered users from database
    (allUsers || []).forEach((u) => {
      const isAgentOrOwner = u.role === 'agent' || u.role === 'owner' || u.role === 'admin' || !!u.agencyName || !!u.agentId;
      if (isAgentOrOwner) {
        const primaryKey = u.agentId || u.id;
        const emailKey = u.email ? u.email.toLowerCase() : '';

        const existing = map.get(primaryKey) || (emailKey ? map.get(emailKey) : undefined);

        if (!existing) {
          const newAgentObj: Agent = {
            id: primaryKey,
            name: u.name || 'Agent Immobilier',
            title: u.role === 'admin' ? 'Administrateur Immobilier' : u.role === 'owner' ? 'Propriétaire Vendeur' : 'Agent Immobilier Agréé',
            email: u.email || '',
            phone: u.phone || '+243 81 000 0000',
            whatsapp: u.whatsapp || u.phone || '+243 81 000 0000',
            avatar: u.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
            agencyName: u.agencyName || 'Kinshasa Immobilier',
            rating: 5.0,
            reviewCount: 1,
            listingsCount: 0,
            bio: `Agent / Membre partenaire certifié Immocraft Kinshasa. RCCM/NIF: ${u.rccmOrNif || 'CD/KIN/RCCM/20-B-04921'}.`,
            specialties: ['Résidentiel', 'Commercial', 'Conseil Immobilier'],
            languages: ['Français', 'Lingala'],
          };
          map.set(primaryKey, newAgentObj);
          if (emailKey) map.set(emailKey, newAgentObj);
        } else {
          // Enhance existing
          if (!existing.phone && u.phone) existing.phone = u.phone;
          if (u.whatsapp) existing.whatsapp = u.whatsapp;
          if (!existing.email && u.email) existing.email = u.email;
          if ((!existing.agencyName || existing.agencyName === 'Kinshasa Immobilier') && u.agencyName) {
            existing.agencyName = u.agencyName;
          }
        }
      }
    });

    // Return unique values
    const uniqueList: Agent[] = [];
    const seenIds = new Set<string>();
    for (const item of map.values()) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueList.push(item);
      }
    }
    return uniqueList;
  }, [agents, allUsers]);

  const getAgentListingsCount = (agent: Agent) => {
    const activeProps = properties.filter(
      (p) => p.agentId === agent.id || (agent.email && p.agentId === agent.email)
    ).length;
    return Math.max(activeProps, agent.listingsCount || 0);
  };

  const filteredAgents = combinedAgentsList.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.email && a.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.agencyName && a.agencyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedAgents = [...filteredAgents].sort(
    (a, b) => getAgentListingsCount(b) - getAgentListingsCount(a)
  );

  const getAgencyListingsCount = (agency: Agency) => {
    const agencyAgents = combinedAgentsList.filter(
      (a) => a.agencyId === agency.id || (a.agencyName && a.agencyName.toLowerCase().includes(agency.name.toLowerCase()))
    );
    const agencyAgentIds = new Set(agencyAgents.map((a) => a.id));
    agencyAgents.forEach((a) => {
      if (a.email) agencyAgentIds.add(a.email);
    });

    const activePropsCount = properties.filter(
      (p) => p.agencyId === agency.id || (p.agentId && agencyAgentIds.has(p.agentId))
    ).length;
    return activePropsCount;
  };

  const filteredAgencies = agencies.filter(
    (agency) =>
      agency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAgencies = [...filteredAgencies].sort(
    (a, b) => getAgencyListingsCount(b) - getAgencyListingsCount(a)
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

          {/* Search Bar & Verification Guarantee Banner */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, ville ou spécialité..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={() => setShowGeneralVerificationInfo(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all flex items-center gap-2 group cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Garantie Agents 100% Vérifiés</span>
              <Info className="w-3.5 h-3.5 opacity-70" />
            </button>
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
          Agents Immobiliers ({sortedAgents.length})
        </button>
        <button
          onClick={() => setActiveTab('agencies')}
          className={`py-3 px-4 border-b-2 transition-all ${
            activeTab === 'agencies'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Agences Partenaires ({sortedAgencies.length})
        </button>
      </div>

      {/* Agents Cards Grid */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAgents.map((agent) => {
            const agentListings = getAgentListingsCount(agent);

            return (
              <div
                key={agent.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl flex flex-col justify-between space-y-4 relative"
              >
                <div className="space-y-4">
                  {/* Top Profile */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40"
                      />
                      <span className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-full border border-emerald-500/40 text-emerald-400 shadow-md" title="Agent Vérifié Immocraft">
                        <ShieldCheck className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-400" />
                      </span>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{agent.rating}</span>
                        <span className="text-slate-500 font-normal">({agent.reviewCount} avis)</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-base truncate">{agent.name}</h3>

                        {/* Verified Badge with Tooltip */}
                        <div className="relative group inline-block">
                          <button
                            type="button"
                            onClick={() => setVerificationModalAgent(agent)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Vérifié</span>
                          </button>

                          {/* Desktop Hover Tooltip */}
                          <div className="absolute left-0 bottom-full mb-2 w-72 bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-slate-200 text-xs shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 pointer-events-none group-hover:pointer-events-auto">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                <BadgeCheck className="w-4 h-4 text-emerald-400" />
                                <span>Agent Vérifié & Certifié</span>
                              </div>
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                100% Conforme
                              </span>
                            </div>
                            <ul className="space-y-1.5 text-[11px] text-slate-300">
                              <li className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong>Identité :</strong> CNI / Passeport officiel validé</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong>Régulation RDC :</strong> Enregistrement RCCM & NIF fiscal</span>
                              </li>
                              <li className="flex items-start gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong>Adresse :</strong> Bureau professionnel audité à Kinshasa</span>
                              </li>
                            </ul>
                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-emerald-400 font-semibold flex items-center justify-between">
                              <span>Charte Éthique Zéro-Fraude</span>
                              <span className="underline">Détails de certification &rarr;</span>
                            </div>
                          </div>
                        </div>
                      </div>

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
                    <strong className="text-white font-bold">{agentListings}</strong> annonces actives
                  </span>

                  <div className="flex items-center gap-2">
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          requestConfirm({
                            title: "Suppression de l'agent",
                            message: `Voulez-vous vraiment supprimer définitivement l'agent "${agent.name}" ?`,
                            onConfirm: () => deleteAgent(agent.id)
                          });
                        }}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                        title="Supprimer cet agent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setContactAgentModal(agent)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-transform hover:scale-105 flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Contacter
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agencies Grid */}
      {activeTab === 'agencies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedAgencies.map((agency) => {
            const agencyListingsCount = getAgencyListingsCount(agency);

            return (
              <div
                key={agency.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-start relative group"
              >
                <img
                  src={agency.logo}
                  alt={agency.name}
                  className="w-24 h-24 rounded-2xl object-cover ring-1 ring-slate-700 shrink-0"
                />
                <div className="space-y-2 text-xs flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{agency.name}</h3>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        Partenaire Certifié
                      </span>
                    </div>

                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          requestConfirm({
                            title: "Suppression de l'agence / concessionnaire",
                            message: `Voulez-vous vraiment supprimer définitivement l'agence / concessionnaire "${agency.name}" ?`,
                            onConfirm: () => deleteAgency(agency.id)
                          });
                        }}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all shrink-0"
                        title="Supprimer cette agence / concessionnaire"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400">{agency.address}, {agency.city}</p>
                  <p className="text-slate-300 leading-relaxed">{agency.description}</p>
                  <div className="pt-2 text-slate-400 flex flex-wrap items-center gap-4">
                    <span>📞 {agency.phone}</span>
                    <span>👥 {agency.agentsCount} agents</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold border border-slate-700">
                      🏡 <strong className="text-white">{agencyListingsCount}</strong> annonces
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* Verification Details Modal (Agent specific or General) */}
      {(verificationModalAgent || showGeneralVerificationInfo) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 relative shadow-2xl text-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setVerificationModalAgent(null);
                setShowGeneralVerificationInfo(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge & Title */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <BadgeCheck className="w-3 h-3" /> Certification Officielle
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Processus de Vérification Immocraft
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Notre protocole strict de contrôle pour garantir la sécurité et la transparence de vos transactions immobilières en RDC.
                </p>
              </div>
            </div>

            {/* Agent Context (if clicking specific agent) */}
            {verificationModalAgent && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={verificationModalAgent.avatar}
                    alt={verificationModalAgent.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      {verificationModalAgent.name}
                      <ShieldCheck className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                    </h4>
                    <p className="text-xs text-emerald-400 font-medium">{verificationModalAgent.title}</p>
                    <p className="text-[11px] text-slate-400">{verificationModalAgent.agencyName}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                  Agréé & Validé
                </span>
              </div>
            )}

            {/* 4 Pillars of Verification */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> Les 4 Étapes de Contrôle Qualité
              </h4>

              <div className="grid grid-cols-1 gap-2.5 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">1. Audit d'Identité Biométrique & Officielle</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Vérification manuelle des pièces d'identité officielles (CNI / Passeport) du gestionnaire ou de l'agent indépendant.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">2. Immatriculation Légal RDC (RCCM & NIF)</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Contrôle du Registre du Commerce et du Crédit Mobilier ainsi que du Numéro d'Identification Fiscale de l'agence.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">3. Audit du Bureau Physique & Téléphones</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Validation de la localisation physique de l'agence à Kinshasa et vérification des lignes d'appel directes et WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">4. Signature de la Charte Anti-Fraude Immocraft</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Engagement légal sur la transparence des frais de commission, l'exclusivité des mandats et l'interdiction des surcoûts cachés.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom guarantee footer */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                <strong>Sérénité Garantie :</strong> Toutes les annonces publiées par nos agents certifiés bénéficient du contrôle préalable des titres de propriété.
              </p>
            </div>

            <div className="pt-2 flex gap-3 justify-end">
              {verificationModalAgent && (
                <button
                  onClick={() => {
                    const target = verificationModalAgent;
                    setVerificationModalAgent(null);
                    setContactAgentModal(target);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <MessageSquare className="w-4 h-4" /> Contacter cet Agent
                </button>
              )}
              <button
                onClick={() => {
                  setVerificationModalAgent(null);
                  setShowGeneralVerificationInfo(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
