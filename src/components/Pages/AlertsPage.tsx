import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmptyState, PageHeaderBar } from '../StateFeedback';
import { buildSearchPath } from '../../utils/navigation';
import {
  Bell,
  BookmarkCheck,
  Trash2,
  Search,
  Plus,
  CheckCircle2,
  X,
} from 'lucide-react';

interface AlertsPageProps {
  onNavigatePath: (path: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigatePath }) => {
  const {
    savedSearches,
    addSavedSearch,
    deleteSavedSearch,
    setFilters,
    inAppBillingNotifications,
    markBillingNotificationRead,
    dismissBillingNotification,
    requestConfirm,
  } = useApp();

  const [tab, setTab] = useState<'alerts' | 'notifications'>('alerts');
  const [newCommune, setNewCommune] = useState('Gombe');
  const [newStatus, setNewStatus] = useState<'for-sale' | 'for-rent'>('for-rent');
  const [newMaxPrice, setNewMaxPrice] = useState('3000');
  const [createdBanner, setCreatedBanner] = useState(false);

  const unreadCount = inAppBillingNotifications.filter((n) => !n.isRead).length;

  const handleQuickCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const maxVal = Number(newMaxPrice);
    setFilters((prev) => ({
      ...prev,
      commune: newCommune,
      status: newStatus,
      maxPrice: !isNaN(maxVal) && maxVal > 0 ? maxVal : 5000000,
    }));
    const label = `${newStatus === 'for-rent' ? 'Location' : 'Achat'} · ${newCommune}${
      maxVal > 0 ? ` ≤ ${maxVal.toLocaleString('fr-FR')} USD` : ''
    }`;
    addSavedSearch(label, 'instant');
    setCreatedBanner(true);
    setTimeout(() => setCreatedBanner(false), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <PageHeaderBar
        title="Alertes & notifications"
        subtitle="Soyez averti dès qu'un bien correspond à vos critères"
        fallbackPath="/"
      />

      {/* Onglets simples */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setTab('alerts')}
          className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            tab === 'alerts'
              ? 'bg-[#1D4ED8] text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>Mes alertes ({savedSearches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('notifications')}
          className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            tab === 'notifications'
              ? 'bg-[#1D4ED8] text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</span>
        </button>
      </div>

      {tab === 'alerts' && (
        <div className="space-y-4">
          {/* Création rapide d'alerte */}
          <form
            onSubmit={handleQuickCreateAlert}
            className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs"
          >
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Créer une nouvelle alerte
            </h2>
            {createdBanner && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#1D4ED8] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Alerte enregistrée ! Vous serez informé des nouvelles annonces.</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as 'for-sale' | 'for-rent')}
                className="h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-semibold text-slate-900"
              >
                <option value="for-rent">À louer</option>
                <option value="for-sale">À vendre</option>
              </select>

              <select
                value={newCommune}
                onChange={(e) => setNewCommune(e.target.value)}
                className="h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-semibold text-slate-900"
              >
                {['Gombe', 'Ngaliema', 'Limete', 'Kintambo', 'Lingwala', 'Mont-Ngafula', 'Lemba', 'Bandalungwa'].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                min={100}
                value={newMaxPrice}
                onChange={(e) => setNewMaxPrice(e.target.value)}
                placeholder="Budget max (USD)"
                className="h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-semibold text-slate-900 tabular-nums"
              />

              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Activer</span>
              </button>
            </div>
          </form>

          {/* Liste des alertes enregistrées */}
          {savedSearches.length === 0 ? (
            <EmptyState
              icon={BookmarkCheck}
              title="Aucune alerte enregistrée"
              description="Créez une alerte ci-dessus ou lancez une recherche pour recevoir les nouveaux biens en priorité."
              actionLabel="Rechercher un bien"
              onAction={() => onNavigatePath('/rechercher')}
            />
          ) : (
            <div className="space-y-2.5">
              {savedSearches.map((saved) => (
                <div
                  key={saved.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{saved.title}</h3>
                    <p className="text-xs text-slate-500">
                      Alerte instantanée · Créée le{' '}
                      {new Date(saved.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(saved.filters);
                        onNavigatePath(
                          buildSearchPath({
                            q: saved.filters.searchQuery,
                            commune: saved.filters.commune,
                            type: saved.filters.type,
                            status: saved.filters.status,
                          })
                        );
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Voir les biens</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: 'Supprimer cette alerte ?',
                          message: `Voulez-vous supprimer l'alerte "${saved.title}" ?`,
                          confirmText: 'Supprimer',
                          onConfirm: () => deleteSavedSearch(saved.id),
                        })
                      }
                      aria-label="Supprimer cette alerte"
                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-2.5">
          {inAppBillingNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Aucune notification pour le moment"
              description="Vos confirmations de publication, messages de prospects et rappels importants apparaîtront ici."
              actionLabel="Explorer les biens"
              onAction={() => onNavigatePath('/rechercher')}
            />
          ) : (
            inAppBillingNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markBillingNotificationRead(notif.id)}
                className={`bg-white border rounded-2xl p-4 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                  notif.isRead ? 'border-slate-200' : 'border-[#1D4ED8] bg-blue-50/30'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!notif.isRead && <span className="w-2 h-2 rounded-full bg-[#1D4ED8] shrink-0" />}
                    <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(notif.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissBillingNotification(notif.id);
                  }}
                  aria-label="Effacer la notification"
                  className="w-9 h-9 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
