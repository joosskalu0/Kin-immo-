import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  getQuartiersForCommune,
  getPopularAvenuesForCommune,
} from '../data/kinshasaLocations';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  BookmarkCheck,
  MapPin,
  Compass,
  Navigation,
} from 'lucide-react';

interface SearchWidgetProps {
  onSubmitSearch?: () => void;
  compactMode?: boolean;
}

export const SearchWidget: React.FC<SearchWidgetProps> = ({
  onSubmitSearch,
  compactMode = false,
}) => {
  const { filters, setFilters, resetFilters, customFields, addSavedSearch } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveSearchTitle, setSaveSearchTitle] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const searchableCustomFields = customFields.filter((cf) => cf.showInSearch && !cf.isPrivate);

  const selectedCommune = filters.commune || 'all';
  const availableQuartiers = selectedCommune !== 'all' ? getQuartiersForCommune(selectedCommune) : [];
  const popularAvenues = selectedCommune !== 'all' ? getPopularAvenuesForCommune(selectedCommune) : [];

  const handleCustomFieldChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: value,
      },
    }));
  };

  const handleSaveSearchTrigger = () => {
    const fallbackTitle =
      [
        filters.status === 'for-sale' ? 'À vendre' : filters.status === 'for-rent' ? 'À louer' : 'Tous',
        filters.commune && filters.commune !== 'all' ? filters.commune : 'Kinshasa',
      ]
        .filter(Boolean)
        .join(' · ');
    addSavedSearch(saveSearchTitle.trim() || fallbackTitle, 'instant');
    setSavedSuccess(true);
    setSaveSearchTitle('');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const popularQuickCommunes = [
    { id: 'all', label: 'Toutes' },
    { id: 'Gombe', label: 'Gombe' },
    { id: 'Ngaliema', label: 'Ngaliema' },
    { id: 'Limete', label: 'Limete' },
    { id: 'Mont-Ngafula', label: 'Mont-Ngafula' },
    { id: 'Kintambo', label: 'Kintambo' },
    { id: 'Lemba', label: 'Lemba' },
    { id: 'Bandalungwa', label: 'Bandalungwa' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 text-slate-800 max-w-5xl mx-auto">
      {/* Onglets de transaction simples */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
        {[
          { id: 'all', label: 'Tous les biens' },
          { id: 'for-sale', label: 'À vendre' },
          { id: 'for-rent', label: 'À louer' },
          { id: 'open-house', label: 'Visites libres' },
          { id: 'sold', label: 'Vendus' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: tab.id as any }))}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              (filters.status || 'all') === tab.id
                ? 'bg-[#1D4ED8] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Ligne principale Commune + Type + Mot-clé + Bouton */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
        <div className="sm:col-span-4 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1D4ED8] pointer-events-none">
            <Compass className="w-4 h-4" />
          </div>
          <select
            aria-label="Choisir une commune"
            value={filters.commune || 'all'}
            onChange={(e) => {
              const val = e.target.value;
              setFilters((prev) => ({
                ...prev,
                commune: val,
                quartier: 'all',
              }));
            }}
            className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#1D4ED8]"
          >
            <option value="all">Toutes les communes</option>
            <optgroup label="Lukunga">
              {['Gombe', 'Ngaliema', 'Kintambo', 'Lingwala', 'Barumbu', 'Kinshasa', 'Mont-Ngafula'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
            <optgroup label="Mont-Amba">
              {['Limete', 'Lemba', 'Matete', 'Ngaba', 'Kisenso'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
            <optgroup label="Funa">
              {['Bandalungwa', 'Kalamu', 'Kasa-Vubu', 'Ngiri-Ngiri', 'Selembao', 'Bumbu', 'Makala'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
            <optgroup label="Tshangu">
              {['Ndjili', 'Masina', 'Kimbanseke', 'Nsele', 'Maluku'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            aria-label="Choisir un type de bien"
            value={filters.type || 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as any }))}
            className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#1D4ED8]"
          >
            <option value="all">Tous les types</option>
            <option value="apartment">Appartement</option>
            <option value="house">Villa / Maison</option>
            <option value="penthouse">Penthouse</option>
            <option value="office">Bureaux / Commerce</option>
            <option value="land">Terrain</option>
          </select>
        </div>

        <div className="sm:col-span-3 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Quartier, avenue ou mot-clé..."
            className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8]"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => onSubmitSearch && onSubmitSearch()}
            className="w-full h-11 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white flex items-center justify-center gap-1.5 font-bold text-sm transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Rechercher</span>
          </button>
        </div>
      </div>

      {/* Raccourcis communes */}
      {!compactMode && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
          <span className="text-xs text-slate-500 font-semibold shrink-0 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#1D4ED8]" /> Communes :
          </span>
          {popularQuickCommunes.map((qc) => {
            const isSelected = (filters.commune || 'all') === qc.id;
            return (
              <button
                key={qc.id}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    commune: qc.id === 'all' ? undefined : qc.id,
                    quartier: 'all',
                  }))
                }
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {qc.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Bascule Filtres avancés */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-bold text-[#1D4ED8] hover:text-[#0B3EA8] flex items-center gap-1.5 cursor-pointer py-1"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Masquer les filtres avancés' : 'Plus de filtres (Budget, Chambres, Quartier)'}</span>
        </button>

        {filters.commune && filters.commune !== 'all' && (
          <span className="text-xs text-slate-600 font-semibold">
            Zone : <strong className="text-[#1D4ED8]">{filters.commune}</strong>
            {filters.quartier && filters.quartier !== 'all' ? ` · ${filters.quartier}` : ''}
          </span>
        )}
      </div>

      {/* Panneau Filtres avancés */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-200 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-[#1D4ED8]" />
              <span>Préciser le quartier ou l'avenue</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Quartier {selectedCommune !== 'all' ? `(${selectedCommune})` : ''}
                </label>
                {selectedCommune !== 'all' && availableQuartiers.length > 0 ? (
                  <select
                    value={filters.quartier || 'all'}
                    onChange={(e) => setFilters((prev) => ({ ...prev, quartier: e.target.value }))}
                    className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                  >
                    <option value="all">Tous les quartiers</option>
                    {availableQuartiers.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ex: Macampagne, Socimat..."
                    value={filters.quartier && filters.quartier !== 'all' ? filters.quartier : ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, quartier: e.target.value }))}
                    className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8]"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Avenue / Boulevard</label>
                <input
                  type="text"
                  list="search-avenue-datalist"
                  placeholder="Ex: Boulevard du 30 Juin..."
                  value={filters.avenue || ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, avenue: e.target.value }))}
                  className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8]"
                />
                <datalist id="search-avenue-datalist">
                  {popularAvenues.map((av) => (
                    <option key={av} value={av} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">
                Budget maximum : {(isNaN(filters.maxPrice as number) ? 5000000 : (filters.maxPrice || 5000000)).toLocaleString('fr-FR')} USD
              </label>
              <input
                type="range"
                min={1000}
                max={5000000}
                step={25000}
                value={isNaN(filters.maxPrice as number) ? 5000000 : (filters.maxPrice || 5000000)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFilters((prev) => ({ ...prev, maxPrice: isNaN(val) ? 5000000 : val }));
                }}
                className="w-full accent-[#1D4ED8] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-bold">
                Chambres minimum : {isNaN(filters.minBedrooms as number) ? 0 : (filters.minBedrooms || 0)}
              </label>
              <input
                type="range"
                min={0}
                max={8}
                value={isNaN(filters.minBedrooms as number) ? 0 : (filters.minBedrooms || 0)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFilters((prev) => ({ ...prev, minBedrooms: isNaN(val) ? 0 : val }));
                }}
                className="w-full accent-[#1D4ED8] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-bold">
                Surface minimum : {isNaN(filters.minArea as number) ? 0 : (filters.minArea || 0)} m²
              </label>
              <input
                type="range"
                min={0}
                max={2500}
                step={25}
                value={isNaN(filters.minArea as number) ? 0 : (filters.minArea || 0)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFilters((prev) => ({ ...prev, minArea: isNaN(val) ? 0 : val }));
                }}
                className="w-full accent-[#1D4ED8] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {searchableCustomFields.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900">Équipements & garanties</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {searchableCustomFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      {(typeof field.label === 'string' ? field.label : field.label?.fr) || field.key}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={filters.customFields?.[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                      >
                        <option value="">Tous</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={filters.customFields?.[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[40px] text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>

            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
              <input
                type="text"
                placeholder="Nom de votre alerte..."
                value={saveSearchTitle}
                onChange={(e) => setSaveSearchTitle(e.target.value)}
                className="h-10 bg-white border border-slate-300 rounded-xl px-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] min-w-0 flex-1 sm:w-44"
              />
              <button
                type="button"
                onClick={handleSaveSearchTrigger}
                className="min-h-[40px] px-3.5 py-2 bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>{savedSuccess ? 'Enregistrée' : 'Créer une alerte'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
