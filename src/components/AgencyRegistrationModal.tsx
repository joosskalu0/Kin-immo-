import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Agency, Agent, User, VerificationDocument } from '../types';
import { saveAgencyToFirestore, saveAgentToFirestore, saveUserToFirestore } from '../lib/firebase';
import { registerUserAccount } from '../lib/authStore';
import {
  X,
  Building2,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Award,
  Globe,
  Users,
  Send,
  Lock,
  BadgeCheck,
  Building,
  Info
} from 'lucide-react';

interface AgencyRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgencyRegistrationModal: React.FC<AgencyRegistrationModalProps> = ({ isOpen, onClose }) => {
  const { addAgency, addAgent, setUser } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agency General Info
  const [agencyName, setAgencyName] = useState('');
  const [legalForm, setLegalForm] = useState<'SARL' | 'SAS' | 'SPRL' | 'Ets' | 'Cabinet'>('SARL');
  const [rccm, setRccm] = useState('');
  const [nif, setNif] = useState('');
  const [idNat, setIdNat] = useState('');
  const [commune, setCommune] = useState('Gombe');
  const [address, setAddress] = useState('');
  
  // Contacts & Team
  const [phone, setPhone] = useState('+243 ');
  const [whatsapp, setWhatsapp] = useState('+243 ');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [agentsCount, setAgentsCount] = useState<number>(5);
  const [description, setDescription] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([
    'Vente Résidentielle Haut Standing',
    'Location Diplomatique Gombe',
    'Gestion Locative & Syndic',
  ]);

  // Manager / Legal Representative
  const [managerName, setManagerName] = useState('');
  const [managerTitle, setManagerTitle] = useState('Directeur Général / Gérant Associé');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPhone, setManagerPhone] = useState('+243 ');
  const [managerIdType, setManagerIdType] = useState<'passport' | 'voter_card' | 'cni'>('passport');
  const [managerIdNumber, setManagerIdNumber] = useState('');
  const [password, setPassword] = useState('');

  // Sample Documents
  const [rccmDocUrl, setRccmDocUrl] = useState('https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80');
  const [managerIdDocUrl, setManagerIdDocUrl] = useState('https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80');

  if (!isOpen) return null;

  const kinshasaCommunes = [
    'Gombe', 'Ngaliema', 'Limete', 'Kintambo', 'Bandalungwa',
    'Lingwala', 'Barumbu', 'Kinshasa', 'Kasa-Vubu', 'Mont-Ngafula',
    'Lemba', 'Matete', 'Ndjili', 'Masina', 'Kalamu'
  ];

  const availableSpecialties = [
    'Vente Résidentielle Haut Standing',
    'Location Diplomatique Gombe',
    'Villas Macampagne & Binza',
    'Gestion Locative & Syndic',
    'Immobilier Commercial & Bureaux',
    'Terrains & Concessions Sécurisées',
    'Conseil Juridique & Titres Fonciers'
  ];

  const toggleSpecialty = (item: string) => {
    if (specialties.includes(item)) {
      setSpecialties(specialties.filter((s) => s !== item));
    } else {
      setSpecialties([...specialties, item]);
    }
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyName.trim()) {
      setError('Veuillez renseigner la raison sociale de votre agence.');
      return;
    }
    if (!address.trim()) {
      setError('Veuillez préciser l\'adresse physique du siège de l\'agence à Kinshasa.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Veuillez renseigner une adresse e-mail professionnelle valide.');
      return;
    }
    if (phone.trim().length < 10) {
      setError('Veuillez renseigner un numéro de téléphone valide (+243...).');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!managerName.trim()) {
      setError('Veuillez renseigner le nom du gérant ou représentant légal.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe administrateur doit comporter au moins 6 caractères.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const agencyId = `agency_${Date.now()}`;
      const chiefAgentId = `agent_dir_${Date.now()}`;
      const nextExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 1. Create Official Agency
      const newAgency: Agency = {
        id: agencyId,
        name: agencyName,
        logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80',
        address: `${address}, Commune de ${commune}`,
        city: 'Kinshasa',
        commune,
        phone,
        whatsapp: whatsapp || phone,
        email,
        website: website || `https://${agencyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.cd`,
        managerName,
        rccm: rccm || 'CD/KIN/RCCM/26-B-08420',
        nif: nif || 'A2609820-DGI',
        idNat: idNat || '01-83-N84910K',
        agentsCount: agentsCount || 5,
        description: description || `Cabinet immobilier agréé à Kinshasa (${commune}). Spécialisé en ${specialties.slice(0, 3).join(', ')}.`,
        specialties,
        isVerified: false,
        verificationStatus: 'pending',
        subscriptionStatus: 'Active',
        subscriptionExpiresAt: nextExpiry,
        planId: 'agency',
        lastPaymentDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      // 2. Prepare Chief Agent Profile
      const chiefAgent: Agent = {
        id: chiefAgentId,
        name: managerName,
        title: `${managerTitle} - ${agencyName}`,
        email: managerEmail || email,
        phone: managerPhone || phone,
        whatsapp: whatsapp || phone,
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
        agencyId: agencyId,
        agencyName: agencyName,
        agencyLogo: newAgency.logo,
        rating: 5.0,
        reviewCount: 1,
        listingsCount: 0,
        bio: `Direction générale de l'agence ${agencyName} à Kinshasa (${commune}). RCCM: ${newAgency.rccm}.`,
        specialties,
        languages: ['Français', 'Lingala', 'English'],
        isVerified: false,
        verificationStatus: 'pending',
        verificationRequestedAt: new Date().toISOString(),
        identityDocType: managerIdType,
        identityDocNumber: managerIdNumber || (managerIdType === 'passport' ? 'OB-992140-CD' : '1029-8819-2041'),
        rccmOrNif: newAgency.rccm,
        verificationDocuments: [
          {
            id: `doc_rccm_${Date.now()}`,
            type: 'rccm',
            title: `Extrait RCCM Officiel - ${agencyName}`,
            documentNumber: newAgency.rccm || 'CD/KIN/RCCM/26-B-08420',
            fileName: `rccm_${agencyName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
            fileSize: '2.4 MB',
            fileUrl: rccmDocUrl,
            uploadedAt: new Date().toISOString(),
            status: 'pending',
          },
          {
            id: `doc_mgr_${Date.now()}`,
            type: managerIdType === 'passport' ? 'passport' : 'voter_card',
            title: managerIdType === 'passport' ? 'Passeport Biométrique du Gérant' : 'Carte d\'Électeur CENI du Gérant',
            documentNumber: managerIdNumber || 'CD-DOC-2026-MGR',
            fileName: `piece_identite_${managerName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
            fileSize: '3.1 MB',
            fileUrl: managerIdDocUrl,
            uploadedAt: new Date().toISOString(),
            status: 'pending',
          },
        ],
        subscriptionStatus: 'Active',
        subscriptionExpiresAt: nextExpiry,
      };

      // 3. Prepare User Object
      const agencyUser: User = {
        id: `user_${agencyId}`,
        name: managerName,
        email: managerEmail || email,
        phone: managerPhone || phone,
        whatsapp: whatsapp || phone,
        role: 'agency',
        avatar: chiefAgent.avatar,
        agentId: chiefAgentId,
        agencyName: agencyName,
        rccmOrNif: newAgency.rccm,
        planId: 'agency',
        subscriptionStatus: 'Active',
        subscriptionExpiresAt: nextExpiry,
        isVerified: false,
        verificationStatus: 'pending',
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        twoFactorMethod: 'authenticator',
        kinshasaBadgeVerified: false,
        identityDocType: managerIdType,
        identityDocNumber: managerIdNumber,
        createdAt: new Date().toISOString(),
        lastLoginLocation: `Kinshasa (${commune}), RDC`,
      };

      // Save to App Context & Storage
      addAgency(newAgency);
      addAgent(chiefAgent);
      setUser(agencyUser);

      // Save to Firestore
      saveAgencyToFirestore(newAgency).catch((e) => console.error('Firestore save agency error:', e));
      saveAgentToFirestore(chiefAgent).catch((e) => console.error('Firestore save agent error:', e));
      saveUserToFirestore(agencyUser).catch((e) => console.error('Firestore save user error:', e));

      // Save user & password to authStore
      registerUserAccount(agencyUser, password);

      setIsLoading(false);
      setSuccess(true);
      setStep(4);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/25 text-slate-950 font-black">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1.5">
            <BadgeCheck className="w-4 h-4" /> Programme Agences & Cabinets Immobiliers Kinshasa
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Inscription d'une Agence Immobilière
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1">
            Rejoignez le réseau officiel des agences immobilières certifiées à Kinshasa. Profitez de <strong>1 Mois Gratuit</strong> pour publier votre catalogue et certifier vos courtiers.
          </p>
        </div>

        {/* Step Indicator */}
        {!success && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { num: 1, title: '1. Informations Agence' },
              { num: 2, title: '2. Contacts & Équipe' },
              { num: 3, title: '3. Gérant & Documents' },
            ].map((s) => (
              <div
                key={s.num}
                className={`p-2 rounded-xl border text-center transition-all ${
                  step === s.num
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                    : step > s.num
                    ? 'bg-slate-950 border-slate-800 text-slate-300'
                    : 'bg-slate-950/50 border-slate-800/60 text-slate-500'
                }`}
              >
                <span className="text-[11px] font-mono block">{s.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Agency Info */}
        {step === 1 && (
          <form onSubmit={handleNextStep1} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Raison Sociale de l'Agence Immobilière *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Ex: Kinshasa Prestige Real Estate SARL"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Forme Juridique
                </label>
                <select
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="SARL">SARL (Société)</option>
                  <option value="SAS">SAS</option>
                  <option value="SPRL">SPRL</option>
                  <option value="Cabinet">Cabinet Professionnel</option>
                  <option value="Ets">Établissement (Ets)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Numéro RCCM (Guichet Unique)
                </label>
                <input
                  type="text"
                  value={rccm}
                  onChange={(e) => setRccm(e.target.value)}
                  placeholder="Ex: CD/KIN/RCCM/24-B-04921"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Numéro NIF (Impôts DGI)
                </label>
                <input
                  type="text"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="Ex: A2409820-P"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ID.NAT (Identification Nationale)
                </label>
                <input
                  type="text"
                  value={idNat}
                  onChange={(e) => setIdNat(e.target.value)}
                  placeholder="Ex: 01-83-N84910K"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Commune du Siège à Kinshasa *
                </label>
                <select
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  {kinshasaCommunes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Adresse Physique du Siège (Avenue & N°) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Avenue Batetela N° 18, Immeuble Crown Tower, 4ème étage"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Offre de lancement : <strong>1er Mois d'Abonnement Offert (Valeur 150 $)</strong></span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                Inclus
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <span>Continuer vers Contacts & Équipe</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Contacts & Team */}
        {step === 2 && (
          <form onSubmit={handleNextStep2} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  E-mail Professionnel de l'Agence *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@kinshasa-prestige.cd"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Site Web Officiel (Optionnel)
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.mon-agence.cd"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Téléphone Principal (+243) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (whatsapp === '+243 ' || !whatsapp) setWhatsapp(e.target.value);
                    }}
                    placeholder="+243 81 555 44 33"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  WhatsApp Business de l'Agence *
                </label>
                <div className="relative">
                  <Send className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+243 81 555 44 33"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre d'Agents & Courtiers dans l'Équipe
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={isNaN(agentsCount) ? '' : agentsCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setAgentsCount(isNaN(val) ? 1 : val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Présentation Courte de l'Agence
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Cabinet expert en immobilier résidentiel de standing à Kinshasa depuis 12 ans."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Spécialités de votre Agence :
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableSpecialties.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialty(spec)}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                      specialties.includes(spec)
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <span>Continuer vers Gérant & Documents</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Manager & Official Congolese Documents */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>
                Conformément à la réglementation foncière en RD Congo, la pièce d'identité du représentant légal (<strong>Passeport Biométrique</strong> ou <strong>Carte d'Électeur CENI</strong>) ainsi que l'extrait RCCM sont requis pour la certification de l'agence.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nom et Prénom du Gérant / Représentant Légal *
                </label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Ex: Jean-Luc Mukamba"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Fonction au sein de l'Agence
                </label>
                <input
                  type="text"
                  value={managerTitle}
                  onChange={(e) => setManagerTitle(e.target.value)}
                  placeholder="Directeur Général / Administrateur Gérant"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pièce d'Identité Officielle du Gérant (RDC) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManagerIdType('passport')}
                    className={`p-2 rounded-xl border text-center text-xs font-bold transition-all ${
                      managerIdType === 'passport'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    🛂 Passeport RDC
                  </button>

                  <button
                    type="button"
                    onClick={() => setManagerIdType('voter_card')}
                    className={`p-2 rounded-xl border text-center text-xs font-bold transition-all ${
                      managerIdType === 'voter_card'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    🗳️ Carte d'Électeur CENI
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Numéro de la Pièce ({managerIdType === 'passport' ? 'N° Passeport' : 'N° Carte d\'Électeur'}) *
                </label>
                <input
                  type="text"
                  required
                  value={managerIdNumber}
                  onChange={(e) => setManagerIdNumber(e.target.value)}
                  placeholder={managerIdType === 'passport' ? 'Ex: OB-8829410-CD' : 'Ex: 1029-4820-9182-84'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  E-mail de Connexion Administrateur Agence *
                </label>
                <input
                  type="email"
                  required
                  value={managerEmail || email}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="directeur@agence.cd"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mot de Passe de l'Espace Agence *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Demo Pre-fill for testing */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Échantillon type Agence pour test rapide :
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAgencyName('Cabinet Immobilier Congo Assets SARL');
                    setLegalForm('SARL');
                    setRccm('CD/KIN/RCCM/24-B-08920');
                    setNif('A2409820-DGI');
                    setIdNat('01-83-N992140');
                    setCommune('Gombe');
                    setAddress('Boulevard du 30 Juin N° 120');
                    setEmail('direction@congoassets.cd');
                    setPhone('+243 81 999 88 77');
                    setWhatsapp('+243 81 999 88 77');
                    setManagerName('Dieudonné Mukendi');
                    setManagerTitle('Directeur Général');
                    setManagerIdType('passport');
                    setManagerIdNumber('OB-992140-CD');
                    setPassword('Kinshasa2026!');
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] text-emerald-400 border border-slate-700 font-semibold"
                >
                  Remplir Démo : Congo Assets SARL (Gombe)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Création du compte agence en cours...</span>
                ) : (
                  <>
                    <span>Valider l'Inscription de l'Agence</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Success Screen */}
        {step === 4 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 mx-auto flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <Award className="w-4 h-4" /> Compte Agence Activé avec Succès !
            </div>

            <h3 className="text-xl font-black text-white">
              Bienvenue chez Immocraft Kinshasa, {agencyName} !
            </h3>

            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Votre agence est désormais enregistrée sur la plateforme. Votre <strong>1er mois gratuit</strong> est actif. Vos pièces justificatives (RCCM & {managerIdType === 'passport' ? 'Passeport' : 'Carte d\'Électeur'}) ont été soumises pour attribution du badge <strong>« Agence Vérifiée Kinshasa »</strong>.
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Agence :</span>
                <span className="font-bold text-white">{agencyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gérant :</span>
                <span className="font-semibold text-emerald-400">{managerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Commune Siège :</span>
                <span className="text-white">{commune}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statut Abonnement :</span>
                <span className="text-emerald-400 font-bold">1 Mois Offert (Actif)</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full max-w-md mx-auto py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-emerald-500/25 block"
              >
                Accéder à mon Tableau de Bord Agence
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
