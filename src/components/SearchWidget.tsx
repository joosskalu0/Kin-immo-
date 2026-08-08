import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
} from 'lucide-react';

export const SearchWidget: React.FC = () => {
  const { filters, setFilters, resetFilters, customFields, addSavedSearch } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveSearchTitle, setSaveSearchTitle] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Searchable custom fields from Fields Builder
  const searchableCustomFields = customFields.filter((cf) => cf.showInSearch && !cf.isPrivate);

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

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-100 transition-all max-w-5xl mx-auto">
      {/* Property Status Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'all', label: 'Tous' },
          { id: 'for-sale', label: 'A Vendre' },
          { id: 'for-rent', label: 'A Louer' },
          { id: 'open-house', label: 'Portes Ouvertes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilters((prev) => ({ ...prev, status: tab.id as any }))}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              (filters.status || 'all') === tab.id
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Search Row (Estatik Style) */}
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        {/* Keyword / Address Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Address, City, ZIP or keyword..."
            className="w-full h-12 bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Type Select */}
        <div className="w-full sm:w-48">
          <select
            value={filters.type || 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as any }))}
            className="w-full h-12 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="all">Category: All</option>
            <option value="apartment">Apartment</option>
            <option value="house">House / Villa</option>
            <option value="penthouse">Penthouse</option>
            <option value="office">Office / Commercial</option>
            <option value="land">Land</option>
          </select>
        </div>

        {/* Coral Search Button */}
        <button
          onClick={() => {}}
          className="h-12 w-12 sm:w-14 shrink-0 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center font-bold shadow-lg shadow-rose-500/25 transition-all hover:scale-105 active:scale-95"
          title="Search properties"
        >
          <Search className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Expand Filters Toggle Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-bold text-slate-300 hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Filters {showAdvanced ? '∧' : '∨'}</span>
        </button>

        <span className="text-[11px] text-slate-500">
          Fields Builder PRO Custom Engine
        </span>
      </div>

      {/* Advanced Filters Drawer */}
      {showAdvanced && (
        <div className="pt-4 border-t border-slate-800 space-y-4 text-xs">
          {/* Price & Specs Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Prix Max: {(filters.maxPrice || 5000000).toLocaleString()} €</label>
              <input
                type="range"
                min={1000}
                max={5000000}
                step={50000}
                value={filters.maxPrice || 5000000}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: Number(e.target.value) }))}
                className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Min Chambres: {filters.minBedrooms || 0}</label>
              <input
                type="range"
                min={0}
                max={8}
                value={filters.minBedrooms || 0}
                onChange={(e) => setFilters((prev) => ({ ...prev, minBedrooms: Number(e.target.value) }))}
                className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Surface Min: {filters.minArea || 0} m²</label>
              <input
                type="range"
                min={0}
                max={500}
                step={10}
                value={filters.minArea || 0}
                onChange={(e) => setFilters((prev) => ({ ...prev, minArea: Number(e.target.value) }))}
                className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* DYNAMIC CUSTOM FIELDS SEARCH FILTER (FIELDS BUILDER) */}
          {searchableCustomFields.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="font-bold text-emerald-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Filtres Dynamiques du Fields Builder
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {searchableCustomFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-slate-400 mb-1 font-medium">
                      {field.label['fr'] || field.key}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={filters.customFields?.[field.key] || ''}
                        onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
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
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
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
              className="text-slate-400 hover:text-white font-semibold flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser les filtres
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nom de l'alerte..."
                value={saveSearchTitle}
                onChange={(e) => setSaveSearchTitle(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSaveSearchTrigger}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md transition-all flex items-center gap-1"
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

