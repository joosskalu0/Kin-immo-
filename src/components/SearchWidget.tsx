import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  KINSHASA_COMMUNES_DATA,
  KINSHASA_COMMUNES_LIST,
  getQuartiersForCommune,
  getPopularAvenuesForCommune,
} from '../data/kinshasaLocations';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  MapPin,
  Compass,
  Navigation,
  Building2,
} from 'lucide-react';

export const SearchWidget: React.FC = () => {
  const { filters, setFilters, resetFilters, customFields, addSavedSearch } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveSearchTitle, setSaveSearchTitle] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Searchable custom fields from Fields Builder
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
    addSavedSearch(saveSearchTitle || 'Ma Recherche Personnalisée', 'instant');
    setSavedSuccess(true);
    setSaveSearchTitle('');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const popularQuickCommunes = [
    { id: 'all', label: 'Toutes les communes' },
    { id: 'Gombe', label: 'Gombe' },
    { id: 'Ngaliema', label: 'Ngaliema (Macampagne)' },
    { id: 'Limete', label: 'Limete' },
    { id: 'Mont-Ngafula', label: 'Mont-Ngafula' },
    { id: 'Kintambo', label: 'Kintambo' },
    { id: 'Lemba', label: 'Lemba' },
    { id: 'Bandalungwa', label: 'Bandalungwa' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 text-slate-800 transition-all max-w-5xl mx-auto">
      {/* Property Status Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'all', label: 'Tous les Biens Disponibles' },
          { id: 'for-sale', label: 'A Vendre' },
          { id: 'for-rent', label: 'A Louer' },
          { id: 'sold', label: 'Archives Biens Vendus' },
          { id: 'open-house', label: 'Portes Ouvertes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilters((prev) => ({ ...prev, status: tab.id as any }))}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              (filters.status || 'all') === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Search Row (Kinshasa Commune + Type + Search Bar) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
        {/* Commune de Kinshasa Picker */}
        <div className="sm:col-span-4 relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">
            <Compass className="w-4 h-4" />
          </div>
          <select
            value={filters.commune || 'all'}
            onChange={(e) => {
              const val = e.target.value;
              setFilters((prev) => ({
                ...prev,
                commune: val,
                quartier: 'all', // Reset quartier when commune changes
              }));
            }}
            className="w-full h-12 bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 transition-colors"
          >
            <option value="all">Toutes les Communes (24)</option>
            <optgroup label="Lukunga (Centre & Résidentiel)">
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
            <optgroup label="Tshangu (Est & Industrie)">
              {['Ndjili', 'Masina', 'Kimbanseke', 'Nsele', 'Maluku'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Keyword / Address / Avenue Input */}
        <div className="sm:col-span-5 relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Quartier, Avenue (ex: 30 Juin, Macampagne)..."
            className="w-full h-12 bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
          />
        </div>

        {/* Type Select */}
        <div className="sm:col-span-2">
          <select
            value={filters.type || 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as any }))}
            className="w-full h-12 bg-slate-50 border border-slate-300 rounded-2xl px-3 py-3 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-600 transition-colors"
          >
            <option value="all">Type: Tous</option>
            <option value="apartment">Appartement</option>
            <option value="house">Villa / Maison</option>
            <option value="penthouse">Penthouse</option>
            <option value="office">Bureaux / Commercial</option>
            <option value="land">Terrain / Concession</option>
          </select>
        </div>

        {/* Search Action Button */}
        <div className="sm:col-span-1">
          <button
            onClick={() => {}}
            className="w-full h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20 transition-all hover:scale-105 active:scale-95"
            title="Rechercher à Kinshasa"
          >
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Quick Commune Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] text-slate-500 font-semibold shrink-0 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-emerald-600" /> Communes :
        </span>
        {popularQuickCommunes.map((qc) => {
          const isSelected = (filters.commune || 'all') === qc.id;
          return (
            <button
              key={qc.id}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  commune: qc.id === 'all' ? undefined : qc.id,
                  quartier: 'all',
                }))
              }
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                isSelected
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {qc.label}
            </button>
          );
        })}
      </div>

      {/* Expand Filters Toggle Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
          <span>Filtres avancés (Quartier, Avenue, Prix, Spécificités) {showAdvanced ? '▲' : '▼'}</span>
        </button>

        {filters.commune && filters.commune !== 'all' && (
          <span className="text-[11px] text-emerald-700 font-bold">
            Filtre actif : {filters.commune} {filters.quartier && filters.quartier !== 'all' ? `› ${filters.quartier}` : ''}
          </span>
        )}
      </div>

      {/* Advanced Filters Drawer */}
      {showAdvanced && (
        <div className="pt-4 border-t border-slate-200 space-y-4 text-xs">
          {/* Quartier & Avenue Deep Filters */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="font-bold text-emerald-800 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-600" />
              Filtrer par Quartier & Avenue de Kinshasa
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Quartier dropdown or input */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  Quartier {selectedCommune !== 'all' ? `(Commune de ${selectedCommune})` : ''}
                </label>
                {selectedCommune !== 'all' && availableQuartiers.length > 0 ? (
                  <select
                    value={filters.quartier || 'all'}
                    onChange={(e) => setFilters((prev) => ({ ...prev, quartier: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="all">Tous les quartiers de {selectedCommune}</option>
                    {availableQuartiers.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Saisir un quartier (ex: Macampagne, Batetela...)"
                    value={filters.quartier && filters.quartier !== 'all' ? filters.quartier : ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, quartier: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                )}
              </div>

              {/* Avenue input with suggestions */}
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  Avenue / Boulevard
                </label>
                <input
                  type="text"
                  list="search-avenue-datalist"
                  placeholder="ex: Boulevard du 30 Juin, Av. des Écuries..."
                  value={filters.avenue || ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, avenue: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
                <datalist id="search-avenue-datalist">
                  {popularAvenues.map((av) => (
                    <option key={av} value={av} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Price & Specs Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 mb-1 font-bold">Prix Max: {(isNaN(filters.maxPrice as number) ? 5000000 : (filters.maxPrice || 5000000)).toLocaleString()} $</label>
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
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-bold">Min Chambres: {isNaN(filters.minBedrooms as number) ? 0 : (filters.minBedrooms || 0)}</label>
              <input
                type="range"
                min={0}
                max={8}
                value={isNaN(filters.minBedrooms as number) ? 0 : (filters.minBedrooms || 0)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFilters((prev) => ({ ...prev, minBedrooms: isNaN(val) ? 0 : val }));
                }}
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-bold">Surface Min: {isNaN(filters.minArea as number) ? 0 : (filters.minArea || 0)} m²</label>
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
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* DYNAMIC CUSTOM FIELDS SEARCH FILTER */}
          {searchableCustomFields.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-emerald-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                Spécificités Kinshasa (Titre Foncier, Groupe Électrogène, Forage Eau)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {searchableCustomFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      {field.label['fr'] || field.key}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={filters.customFields?.[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                      >
                        <option value="">Tous</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={filters.customFields?.[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset & Save Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={resetFilters}
              className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser les filtres
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nom de l'alerte..."
                value={saveSearchTitle}
                onChange={(e) => setSaveSearchTitle(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
              <button
                onClick={handleSaveSearchTrigger}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                {savedSuccess ? '✓ Sauvegardé !' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

