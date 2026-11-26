import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomFieldDefinition, FieldType, FieldGroup } from '../../types';
import {
  Plus,
  SlidersHorizontal,
  Trash2,
  Lock,
  Search,
  Info,
} from 'lucide-react';
import { PageHeaderBar } from '../StateFeedback';

interface FieldsBuilderPageProps {
  onBack?: () => void;
}

export const FieldsBuilderPage: React.FC<FieldsBuilderPageProps> = ({ onBack }) => {
  const { customFields, addCustomField, deleteCustomField } = useApp();

  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage');
  const [key, setKey] = useState('');
  const [labelFr, setLabelFr] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [group, setGroup] = useState<FieldGroup>('specs');
  const [optionsStr, setOptionsStr] = useState('');
  const [unit, setUnit] = useState('');
  const [required, setRequired] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showInSearch, setShowInSearch] = useState(true);

  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !labelFr) return;

    const newField: CustomFieldDefinition = {
      id: `field_${Date.now()}`,
      key: key.trim().toLowerCase().replace(/\s+/g, '_'),
      label: { fr: labelFr, en: labelEn || labelFr },
      type,
      group,
      options: optionsStr ? optionsStr.split(',').map((s) => s.trim()) : undefined,
      unit: unit || undefined,
      required,
      isPrivate,
      showInSearch,
      icon: 'Zap',
    };

    addCustomField(newField);
    setKey('');
    setLabelFr('');
    setLabelEn('');
    setOptionsStr('');
    setUnit('');
    setRequired(false);
    setIsPrivate(false);
    setShowInSearch(true);
    setActiveTab('manage');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <PageHeaderBar
        title="Champs personnalisés"
        subtitle="Critères des annonces et filtres de recherche"
        fallbackPath="/admin"
        onBack={onBack}
      />

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="flex border-b border-slate-200 px-4 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-4 font-bold text-xs border-b-2 cursor-pointer ${
              activeTab === 'manage'
                ? 'border-[#1D4ED8] text-[#1D4ED8]'
                : 'border-transparent text-slate-600'
            }`}
          >
            Champs actifs ({customFields.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'border-[#1D4ED8] text-[#1D4ED8]'
                : 'border-transparent text-slate-600'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau champ</span>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'manage' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                <p>Ces champs apparaissent dans la publication, la fiche bien et le comparateur.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {(typeof field.label === 'string' ? field.label : field.label?.fr) || field.key}
                        </span>
                        {field.isPrivate && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Privé
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        {field.key} · {field.type}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                          {field.group}
                        </span>
                        {field.unit && (
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            {field.unit}
                          </span>
                        )}
                        {field.showInSearch && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1D4ED8] flex items-center gap-1">
                            <Search className="w-2.5 h-2.5" /> Filtre
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteCustomField(field.id)}
                      className="p-2 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateField} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom du champ (FR) *</label>
                  <input
                    type="text"
                    required
                    value={labelFr}
                    onChange={(e) => setLabelFr(e.target.value)}
                    placeholder="ex: Puissance groupe électrogène"
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clé technique *</label>
                  <input
                    type="text"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="ex: generator_kva"
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as FieldType)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-slate-900"
                  >
                    <option value="text">Texte</option>
                    <option value="number">Nombre</option>
                    <option value="area">Surface (m²)</option>
                    <option value="select">Liste</option>
                    <option value="checkbox">Case à cocher</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Groupe</label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value as FieldGroup)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-slate-900"
                  >
                    <option value="specs">Caractéristiques</option>
                    <option value="general">Général</option>
                    <option value="financial">Financier</option>
                    <option value="private">Privé Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unité</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="ex: kVA, m²"
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-slate-900"
                  />
                </div>
              </div>

              {type === 'select' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Options (séparées par virgule)</label>
                  <input
                    type="text"
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    placeholder="Option 1, Option 2"
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-slate-900"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
                  <span className="font-semibold">Obligatoire</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  <span className="font-semibold">Privé Pro</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input type="checkbox" checked={showInSearch} onChange={(e) => setShowInSearch(e.target.checked)} />
                  <span className="font-semibold">Afficher dans la recherche</span>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Ajouter le champ</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
