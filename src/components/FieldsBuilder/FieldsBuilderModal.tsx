import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomFieldDefinition, FieldType, FieldGroup } from '../../types';
import {
  X,
  Plus,
  SlidersHorizontal,
  Trash2,
  Lock,
  Search,
  CheckCircle2,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';

export const FieldsBuilderModal: React.FC = () => {
  const {
    isFieldsBuilderOpen,
    setIsFieldsBuilderOpen,
    customFields,
    addCustomField,
    deleteCustomField,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage');

  // Form State
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

  if (!isFieldsBuilderOpen) return null;

  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !labelFr) return;

    const newField: CustomFieldDefinition = {
      id: `field_${Date.now()}`,
      key: key.trim().toLowerCase().replace(/\s+/g, '_'),
      label: {
        fr: labelFr,
        en: labelEn || labelFr,
      },
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

    // Reset Form
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <SlidersHorizontal className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Fields Builder Engine
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                  PRO
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Créez un nombre illimité de champs personnalisés (text, number, area, contact, privé, etc.)
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsFieldsBuilderOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all ${
              activeTab === 'manage'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Champs Actifs ({customFields.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Créer un Nouveau Champ
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'manage' ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-xs text-emerald-300 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Ces champs s'intègrent automatiquement dans les formulaires de création d'annonces, les fiches détaillées, le comparateur, le widget de recherche et l'export PDF.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {field.label['fr'] || field.key}
                        </span>
                        {field.isPrivate && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30">
                            <Lock className="w-3 h-3" /> Privé
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono">
                        Clé: <span className="text-emerald-400">{field.key}</span> | Type:{' '}
                        <span className="text-slate-300">{field.type}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Groupe: {field.group}
                        </span>
                        {field.unit && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Unité: {field.unit}
                          </span>
                        )}
                        {field.showInSearch && (
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                            <Search className="w-2.5 h-2.5" /> Filtre Recherche
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteCustomField(field.id)}
                      title="Supprimer ce champ"
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-colors"
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
                  <label className="block font-semibold text-slate-300 mb-1">
                    Libellé du champ (Français) *
                  </label>
                  <input
                    type="text"
                    required
                    value={labelFr}
                    onChange={(e) => setLabelFr(e.target.value)}
                    placeholder="ex: Diagnostic Énergétique (DPE)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Label (English)
                  </label>
                  <input
                    type="text"
                    value={labelEn}
                    onChange={(e) => setLabelEn(e.target.value)}
                    placeholder="e.g. Energy Performance Rating"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Clé système (unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="ex: dpe_rating"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Type de champ *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as FieldType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="text">Texte libre (Text)</option>
                    <option value="number">Nombre (Number)</option>
                    <option value="area">Surface (Area m²)</option>
                    <option value="select">Liste Déroulante (Select)</option>
                    <option value="checkbox">Case à Cocher (Checkbox)</option>
                    <option value="textarea">Zone Texte Longue (Textarea)</option>
                    <option value="date">Date</option>
                    <option value="file">Pièce Jointe / Fichier (File)</option>
                    <option value="contact">Champs Contact (Phone/Email)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Groupe d'affichage
                  </label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value as FieldGroup)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="specs">Caractéristiques (Specs)</option>
                    <option value="general">Informations Générales</option>
                    <option value="financial">Financier & Taxes</option>
                    <option value="media">Médias & Fichiers</option>
                    <option value="private">Privé (Agents/Admins uniquement)</option>
                  </select>
                </div>
              </div>

              {type === 'select' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Options du menu déroulant (séparées par des virgules)
                  </label>
                  <input
                    type="text"
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    placeholder="Option A, Option B, Option C"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Unité de mesure (optionnel)
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="ex: m², kWh/m², €/an, %"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded"
                  />
                  <span className="text-slate-300 font-medium">Champ Obligatoire</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="accent-amber-500 w-4 h-4 rounded"
                  />
                  <span className="text-amber-300 font-medium flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Champ Privé (PRO)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    checked={showInSearch}
                    onChange={(e) => setShowInSearch(e.target.checked)}
                    className="accent-sky-500 w-4 h-4 rounded"
                  />
                  <span className="text-sky-300 font-medium flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" /> Filtre Recherche
                  </span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:scale-[1.02] transition-transform shadow-md shadow-emerald-500/20"
                >
                  Créer et Ajouter le Champ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
