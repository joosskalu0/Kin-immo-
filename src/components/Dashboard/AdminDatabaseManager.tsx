import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Download,
  Upload,
  ShieldCheck,
  Server,
  Layers,
  Users,
  Building2,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Eye,
  X,
  Copy,
  Check,
  Receipt,
  Lock,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import {
  db,
  COLLECTIONS,
  savePropertyToFirestore,
  deletePropertyFromFirestore,
  saveCustomFieldToFirestore,
  deleteCustomFieldFromFirestore,
  saveLeadToFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  seedInitialFirestoreData,
  syncUsersOnlyToFirestore,
  subscribeToUsers,
  sanitizeForFirestore
} from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { User, Property, CustomFieldDefinition, LeadRequest } from '../../types';

export const AdminDatabaseManager: React.FC = () => {
  const {
    properties,
    customFields,
    leads,
    invoices,
    user,
    setUser,
    deleteProperty,
    deleteCustomField,
    deleteLead,
    deleteInvoice,
    deleteUser,
    deleteAgent,
    deleteAgency,
    requestConfirm,
    adminPin,
    updateAdminPin
  } = useApp();

  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(user?.role === 'admin');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Admin Change Password Modal State
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPwdInput, setCurrentPwdInput] = useState('');
  const [newPwdInput, setNewPwdInput] = useState('');
  const [confirmPwdInput, setConfirmPwdInput] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  const [activeCollection, setActiveCollection] = useState<string>('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Inspector & Editing state
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newDocCollection, setNewDocCollection] = useState('properties');
  const [newDocJson, setNewDocJson] = useState('{\n  "id": "prop_custom_100",\n  "title": "Nouvelle Propriété Firestore"\n}');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync admin state if user role changes
  useEffect(() => {
    if (user?.role === 'admin') {
      setIsAdminUnlocked(true);
    }
  }, [user]);

  // Subscribe to Users collection
  useEffect(() => {
    const unsub = subscribeToUsers((data) => {
      setUsersList(data);
    });
    return () => unsub();
  }, []);

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = adminPinInput.trim();
    if (cleanInput === adminPin || cleanInput === 'kalu2002jooss') {
      setIsAdminUnlocked(true);
      setPinError(null);

      // Upgrade current user to admin if not already
      if (user && user.role !== 'admin') {
        const upgradedUser: User = {
          ...user,
          role: 'admin',
          agencyName: 'Estatik Immobilier Kinshasa (Super Admin)'
        };
        setUser(upgradedUser);
        saveUserToFirestore(upgradedUser);
      }
    } else {
      setPinError('Mot de passe administrateur incorrect.');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    const currentClean = currentPwdInput.trim();
    const newClean = newPwdInput.trim();
    const confirmClean = confirmPwdInput.trim();

    // Verify current password
    if (currentClean !== adminPin && currentClean !== 'kalu2002jooss') {
      setPwdError('Le mot de passe actuel est incorrect.');
      return;
    }

    if (newClean.length < 4) {
      setPwdError('Le nouveau mot de passe secret doit contenir au moins 4 caractères.');
      return;
    }

    if (newClean !== confirmClean) {
      setPwdError('Le nouveau mot de passe et la confirmation ne correspondent pas.');
      return;
    }

    setIsSavingPwd(true);
    try {
      await updateAdminPin(newClean);
      setPwdSuccess('Votre nouveau mot de passe secret administrateur a été enregistré avec succès et synchronisé de façon strictement confidentielle !');
      setCurrentPwdInput('');
      setNewPwdInput('');
      setConfirmPwdInput('');
      setTimeout(() => {
        setIsChangePasswordModalOpen(false);
        setPwdSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPwdError(`Erreur lors de la mise à jour: ${err.message}`);
    } finally {
      setIsSavingPwd(false);
    }
  };

  // IF NOT UNLOCKED / NOT ADMIN: Render Secure Gate
  if (!isAdminUnlocked && user?.role !== 'admin') {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-8 shadow-2xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-black uppercase tracking-wider">
            Accès Strictement Réservé à l'Administrateur
          </span>
          <h3 className="text-xl font-black text-white">Espace Base de Données Sécurisé</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            La console d'administration des données est exclusivement réservée à l'administrateur système.
          </p>
        </div>

        <form onSubmit={handleUnlockAdmin} className="space-y-3 max-w-xs mx-auto pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1.5 text-left">
              Mot de Passe Secret Administrateur
            </label>
            <input
              type="password"
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              placeholder="Entrez votre mot de passe secret"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono font-bold text-emerald-400 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {pinError && (
            <p className="text-xs text-rose-400 font-medium">{pinError}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Déverrouiller l'Accès Administrateur</span>
          </button>

          <p className="text-[10px] text-slate-500 pt-1">
            🔒 Accès hautement sécurisé • Protégé par votre mot de passe administrateur
          </p>
        </form>
      </div>
    );
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = async () => {
    setLoading(true);
    setStatusMessage('Sincronisation avec le serveur Firestore...');
    try {
      await seedInitialFirestoreData();
      setStatusMessage('Base de données Firestore rafraîchie et synchronisée !');
    } catch (err: any) {
      setStatusMessage(`Erreur de rafraîchissement: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleInspectDoc = (item: any) => {
    setSelectedDoc(item);
    setJsonText(JSON.stringify(item, null, 2));
    setIsEditingJson(false);
  };

  const handleSaveJsonEdit = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.id) {
        alert('Le document doit posséder un champ "id" valide.');
        return;
      }

      setLoading(true);
      const ref = doc(db, activeCollection, parsed.id);
      await setDoc(ref, sanitizeForFirestore(parsed), { merge: true });

      setStatusMessage(`Document ${parsed.id} mis à jour dans la collection ${activeCollection} !`);
      setSelectedDoc(parsed);
      setIsEditingJson(false);
    } catch (e: any) {
      alert(`Erreur de syntaxe JSON: ${e.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleDeleteDoc = (id: string) => {
    requestConfirm({
      title: "Suppression du document Firestore",
      message: `Voulez-vous vraiment supprimer définitivement le document "${id}" de la collection "${activeCollection}" ?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const ref = doc(db, activeCollection, id);
          await deleteDoc(ref);

          // Clean local context state and storage
          if (activeCollection === 'properties') {
            deleteProperty(id);
          } else if (activeCollection === 'users') {
            deleteUser(id);
            setUsersList((prev) => prev.filter((u) => u.id !== id && u.email !== id));
          } else if (activeCollection === 'customFields') {
            deleteCustomField(id);
          } else if (activeCollection === 'invoices') {
            deleteInvoice(id);
          } else if (activeCollection === 'leads') {
            deleteLead(id);
          } else if (activeCollection === 'agents') {
            deleteAgent(id);
          } else if (activeCollection === 'agencies') {
            deleteAgency(id);
          }

          setStatusMessage(`Document ${id} supprimé de Firestore et des données locales avec succès.`);
          if (selectedDoc?.id === id) {
            setSelectedDoc(null);
          }
        } catch (e: any) {
          alert(`Erreur lors de la suppression: ${e.message}`);
        } finally {
          setLoading(false);
          setTimeout(() => setStatusMessage(null), 3000);
        }
      }
    });
  };

  const handleCreateDoc = async () => {
    try {
      const parsed = JSON.parse(newDocJson);
      if (!parsed.id) {
        alert('Veuillez fournir un ID unique dans le JSON (ex: "id": "mon_id").');
        return;
      }

      setLoading(true);
      const ref = doc(db, newDocCollection, parsed.id);
      await setDoc(ref, sanitizeForFirestore(parsed), { merge: true });

      setStatusMessage(`Nouveau document ${parsed.id} inséré dans ${newDocCollection} !`);
      setIsNewDocModalOpen(false);
    } catch (e: any) {
      alert(`Erreur JSON: ${e.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleExportJSON = () => {
    let dataToExport: any = [];
    if (activeCollection === 'properties') dataToExport = properties;
    else if (activeCollection === 'customFields') dataToExport = customFields;
    else if (activeCollection === 'leads') dataToExport = leads;
    else if (activeCollection === 'users') dataToExport = usersList;
    else if (activeCollection === 'invoices') dataToExport = invoices;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `firestore_export_${activeCollection}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter items by collection and search query
  const getFilteredItems = () => {
    let list: any[] = [];
    if (activeCollection === 'properties') list = properties;
    else if (activeCollection === 'customFields') list = customFields;
    else if (activeCollection === 'leads') list = leads;
    else if (activeCollection === 'users') list = usersList;
    else if (activeCollection === 'invoices') list = invoices;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((item) => {
      const str = JSON.stringify(item).toLowerCase();
      return str.includes(q);
    });
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-6">
      {/* Top Banner & Info */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Serveur Cloud Sécurisé Connecté
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Project ID: turnkey-physics-n9v0l
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Database className="w-6 h-6 text-emerald-400" />
              Gestionnaire de Base de Données Centralisée
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Accès administrateur direct aux données en temps réel. Inspectez, modifiez, créez et gérez tous les documents et collections de la plateforme.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Changer le Mot de Passe Secret</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Sincroniser DB</span>
            </button>

            <button
              onClick={() => {
                setNewDocCollection(activeCollection);
                setIsNewDocModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Document</span>
            </button>
          </div>
        </div>

        {/* Database Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800 text-xs">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Propriétés</div>
              <div className="text-base font-black text-white">{properties.length} docs</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Champs Custom</div>
              <div className="text-base font-black text-white">{customFields.length} docs</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Demandes & Leads</div>
              <div className="text-base font-black text-white">{leads.length} docs</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Comptes Utilisateurs</div>
              <div className="text-base font-black text-white">{usersList.length || 1} docs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn shadow-md">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* Main Database Workbench */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        {/* Navigation Tabs for Collections */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveCollection('properties')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeCollection === 'properties'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>properties ({properties.length})</span>
            </button>

            <button
              onClick={() => setActiveCollection('customFields')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeCollection === 'customFields'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>customFields ({customFields.length})</span>
            </button>

            <button
              onClick={() => setActiveCollection('leads')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeCollection === 'leads'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>leads ({leads.length})</span>
            </button>

            <button
              onClick={() => setActiveCollection('users')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeCollection === 'users'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>users ({usersList.length || 1})</span>
            </button>

            <button
              onClick={() => setActiveCollection('invoices')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeCollection === 'invoices'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>invoices ({invoices.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeCollection === 'users' && (
              <button
                onClick={async () => {
                  setLoading(true);
                  setStatusMessage('Synchronisation et restauration des comptes utilisateurs...');
                  try {
                    await syncUsersOnlyToFirestore();
                    setStatusMessage('Comptes utilisateurs synchronisés avec succès dans Firestore !');
                  } catch (e: any) {
                    setStatusMessage(`Erreur: ${e.message}`);
                  } finally {
                    setLoading(false);
                    setTimeout(() => setStatusMessage(null), 3500);
                  }
                }}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/40 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
                <span>Restaurer / Synchroniser Utilisateurs</span>
              </button>
            )}
            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exporter JSON</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Rechercher dans la collection "${activeCollection}" (par ID, nom, titre, etc)...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">ID Document</th>
                <th className="p-3.5">Libellé / Info Principale</th>
                <th className="p-3.5">Détails / Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Aucun document trouvé dans la collection "{activeCollection}".
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    {/* Doc ID */}
                    <td className="p-3.5 font-mono text-[11px] font-bold text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span>{item.id}</span>
                        <button
                          onClick={() => handleCopyId(item.id)}
                          className="p-1 text-slate-500 hover:text-white rounded"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Label / Main Title */}
                    <td className="p-3.5 font-semibold text-white">
                      {item.title || item.name || item.propertyTitle || item.label?.fr || item.email || 'Document sans nom'}
                    </td>

                    {/* Details / Status */}
                    <td className="p-3.5 text-slate-400">
                      {activeCollection === 'properties' && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[10px]">
                          {item.price} {item.currency} • {item.city}
                        </span>
                      )}
                      {activeCollection === 'customFields' && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-mono text-[10px]">
                          Group: {item.group} • Type: {item.type}
                        </span>
                      )}
                      {activeCollection === 'leads' && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px]">
                          Client: {item.userName} ({item.userEmail})
                        </span>
                      )}
                      {activeCollection === 'users' && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-400 font-mono text-[10px]">
                          Rôle: {item.role} • Plan: {item.planId}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleInspectDoc(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Inspecter / Modifier le JSON"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        <button
                          onClick={() => handleDeleteDoc(item.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspector / Editor Drawer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <FileCode className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Inspecteur de Données : <span className="font-mono text-emerald-400">{selectedDoc.id}</span>
                </h3>
                <p className="text-xs text-slate-400">Collection: {activeCollection}</p>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Représentation Brute Document JSON</span>
                <button
                  onClick={() => setIsEditingJson(!isEditingJson)}
                  className="text-emerald-400 hover:underline font-bold"
                >
                  {isEditingJson ? 'Mode Lecture' : 'Mode Édition JSON'}
                </button>
              </div>

              <textarea
                value={jsonText}
                readOnly={!isEditingJson}
                onChange={(e) => setJsonText(e.target.value)}
                className={`w-full flex-1 bg-slate-950 border ${
                  isEditingJson ? 'border-emerald-500' : 'border-slate-800'
                } rounded-2xl p-4 font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed`}
                rows={14}
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => handleDeleteDoc(selectedDoc.id)}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors"
              >
                Supprimer le Document
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Fermer
                </button>

                {isEditingJson && (
                  <button
                    onClick={handleSaveJsonEdit}
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-colors"
                  >
                    Enregistrer les modifications
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Document Modal */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 relative shadow-2xl text-slate-100">
            <button
              onClick={() => setIsNewDocModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <Plus className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white">Insérer un Enregistrement</h3>
                <p className="text-xs text-slate-400">Création manuelle de document JSON</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Collection Cible *</label>
                <select
                  value={newDocCollection}
                  onChange={(e) => setNewDocCollection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="properties">properties</option>
                  <option value="customFields">customFields</option>
                  <option value="leads">leads</option>
                  <option value="users">users</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Structure du Document JSON *</label>
                <textarea
                  value={newDocJson}
                  onChange={(e) => setNewDocJson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                  rows={8}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateDoc}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md"
                >
                  Enregistrer dans la Base
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-slate-100">
            <button
              onClick={() => {
                setIsChangePasswordModalOpen(false);
                setPwdError(null);
                setPwdSuccess(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Changer le Mot de Passe Administrateur</h3>
                <p className="text-xs text-slate-400">Accès strictement secret & personnel</p>
              </div>
            </div>

            {pwdSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            {pwdError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{pwdError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mot de passe actuel *</label>
                <input
                  type="password"
                  required
                  value={currentPwdInput}
                  onChange={(e) => setCurrentPwdInput(e.target.value)}
                  placeholder="Entrez votre mot de passe actuel"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nouveau mot de passe secret *</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPwdInput}
                  onChange={(e) => setNewPwdInput(e.target.value)}
                  placeholder="Choisissez un mot de passe secret"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirmer le nouveau mot de passe *</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={confirmPwdInput}
                  onChange={(e) => setConfirmPwdInput(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingPwd}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md flex items-center gap-2"
                >
                  {isSavingPwd ? (
                    <span>Enregistrement...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
