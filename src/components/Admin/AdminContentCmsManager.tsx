import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  FileText,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  BLOG_CATEGORY_LABELS,
  DEFAULT_LEGAL_COMPANY_META,
  slugifyText,
} from '../../data/contentSeed';
import {
  BlogArticle,
  BlogCategory,
  LegalCompanyMeta,
  LegalDocument,
  LegalDocumentSlug,
} from '../../types';

export const AdminContentCmsManager: React.FC = () => {
  const {
    blogArticles,
    legalDocuments,
    upsertBlogArticle,
    deleteBlogArticle,
    updateLegalDocument,
    requestConfirm,
  } = useApp();

  const [subTab, setSubTab] = useState<'blog' | 'legal'>('blog');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Blog editor state
  const [editingArticle, setEditingArticle] = useState<Partial<BlogArticle> | null>(null);
  const [isSavingArticle, setIsSavingArticle] = useState(false);

  // Legal editor state
  const [selectedLegalSlug, setSelectedLegalSlug] = useState<LegalDocumentSlug>('conditions-utilisation');
  const currentLegalDoc =
    legalDocuments.find((d) => d.slug === selectedLegalSlug) || legalDocuments[0];
  const [legalDraft, setLegalDraft] = useState<LegalDocument>(currentLegalDoc);
  const [companyMetaDraft, setCompanyMetaDraft] = useState<LegalCompanyMeta>(
    currentLegalDoc?.companyMeta || DEFAULT_LEGAL_COMPANY_META
  );
  const [isSavingLegal, setIsSavingLegal] = useState(false);

  useEffect(() => {
    const found = legalDocuments.find((d) => d.slug === selectedLegalSlug);
    if (found) {
      setLegalDraft(found);
      setCompanyMetaDraft(found.companyMeta || DEFAULT_LEGAL_COMPANY_META);
    }
  }, [selectedLegalSlug, legalDocuments]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenNewArticle = () => {
    setEditingArticle({
      title: '',
      slug: '',
      excerpt: '',
      content: '## Introduction\n\nRédigez votre guide immobilier Kinshasa ici...',
      category: 'guide_achat',
      coverImage: '/og-images/blog_gombe_skyline_1795161879500.jpg',
      authorName: 'Équipe Éditoriale Kinimmo',
      authorRole: 'Rédaction & Conseil',
      readTimeMinutes: 5,
      status: 'published',
      featured: false,
      tags: ['Kinshasa', 'Immobilier'],
      relatedCommune: 'Gombe',
    });
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle?.title?.trim()) return;
    setIsSavingArticle(true);
    try {
      const res = await upsertBlogArticle({
        ...editingArticle,
        slug: slugifyText(editingArticle.slug || editingArticle.title),
      });
      if (res.success) {
        showStatus('success', res.message || 'Article enregistré.');
        setEditingArticle(null);
      } else {
        showStatus('error', res.message || 'Échec de sauvegarde.');
      }
    } finally {
      setIsSavingArticle(false);
    }
  };

  const handleSaveLegal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLegal(true);
    try {
      const res = await updateLegalDocument(selectedLegalSlug, {
        ...legalDraft,
        companyMeta: companyMetaDraft,
      });
      if (res.success) {
        showStatus('success', res.message || 'Document légal et mentions mis à jour.');
      } else {
        showStatus('error', res.message || 'Échec de mise à jour.');
      }
    } finally {
      setIsSavingLegal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div>
          <h2 className="text-xl font-black text-white">
            CMS Contenus, Blog & Pages Légales
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gérez les articles/guides du blog (/blog) ainsi que les textes légaux et coordonnées officielles (/conditions-utilisation, /confidentialite, /mentions-legales).
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setSubTab('blog')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              subTab === 'blog' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Blog & Guides ({blogArticles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('legal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              subTab === 'legal' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pages Légales & RCCM</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.msg}</span>
        </div>
      )}

      {subTab === 'blog' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Articles et Guides publiés / brouillons</h3>
            <button
              type="button"
              onClick={handleOpenNewArticle}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvel article / guide</span>
            </button>
          </div>

          {editingArticle && (
            <form
              onSubmit={handleSaveArticle}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-base font-bold text-white">
                  {editingArticle.id ? 'Modifier le guide' : 'Créer un nouvel article / guide'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Titre de l’article *</label>
                  <input
                    type="text"
                    required
                    value={editingArticle.title || ''}
                    onChange={(e) =>
                      setEditingArticle((prev) => ({
                        ...prev,
                        title: e.target.value,
                        slug: prev?.id ? prev.slug : slugifyText(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Slug URL (/blog/:slug)</label>
                  <input
                    type="text"
                    required
                    value={editingArticle.slug || ''}
                    onChange={(e) => setEditingArticle((p) => ({ ...p, slug: slugifyText(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Catégorie</label>
                  <select
                    value={editingArticle.category || 'guide_achat'}
                    onChange={(e) =>
                      setEditingArticle((p) => ({ ...p, category: e.target.value as BlogCategory }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    {(Object.keys(BLOG_CATEGORY_LABELS) as BlogCategory[]).map((k) => (
                      <option key={k} value={k}>
                        {BLOG_CATEGORY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Statut</label>
                    <select
                      value={editingArticle.status || 'published'}
                      onChange={(e) =>
                        setEditingArticle((p) => ({ ...p, status: e.target.value as 'published' | 'draft' }))
                      }
                      className="w-full px-2.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="published">Publié</option>
                      <option value="draft">Brouillon</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Lecture (min)</label>
                    <input
                      type="number"
                      min={1}
                      value={editingArticle.readTimeMinutes || 5}
                      onChange={(e) =>
                        setEditingArticle((p) => ({ ...p, readTimeMinutes: Number(e.target.value) || 5 }))
                      }
                      className="w-full px-2.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Commune liée</label>
                    <input
                      type="text"
                      value={editingArticle.relatedCommune || ''}
                      onChange={(e) => setEditingArticle((p) => ({ ...p, relatedCommune: e.target.value }))}
                      placeholder="Gombe"
                      className="w-full px-2.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-slate-300 font-semibold">Résumé / Extrait SEO (120–160 caractères)</label>
                <textarea
                  rows={2}
                  required
                  value={editingArticle.excerpt || ''}
                  onChange={(e) => setEditingArticle((p) => ({ ...p, excerpt: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-slate-300 font-semibold">
                  Contenu complet (utilisez « ## Titre » pour les sections et « - élément » pour les listes)
                </label>
                <textarea
                  rows={8}
                  required
                  value={editingArticle.content || ''}
                  onChange={(e) => setEditingArticle((p) => ({ ...p, content: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingArticle.featured)}
                    onChange={(e) => setEditingArticle((p) => ({ ...p, featured: e.target.checked }))}
                    className="rounded border-slate-700"
                  />
                  <span>Mettre à la une en haut du blog</span>
                </label>

                <button
                  type="submit"
                  disabled={isSavingArticle}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingArticle ? 'Enregistrement...' : 'Enregistrer l’article'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blogArticles.map((art) => (
              <div
                key={art.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-emerald-400 font-semibold">
                      {BLOG_CATEGORY_LABELS[art.category]} · {art.readTimeMinutes} min
                    </span>
                    <span
                      className={`font-bold ${
                        art.status === 'published' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {art.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{art.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{art.excerpt}</p>
                  <p className="text-[11px] font-mono text-slate-500">/blog/{art.slug}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingArticle(art)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Éditer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      requestConfirm({
                        title: 'Supprimer cet article',
                        message: `Confirmez-vous la suppression de « ${art.title} » ?`,
                        confirmText: 'Supprimer',
                        onConfirm: () => {
                          deleteBlogArticle(art.id);
                        },
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'legal' && legalDraft && (
        <form onSubmit={handleSaveLegal} className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { slug: 'conditions-utilisation', label: "Conditions d'utilisation" },
                { slug: 'confidentialite', label: 'Politique de confidentialité' },
                { slug: 'mentions-legales', label: 'Mentions légales' },
              ] as const
            ).map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setSelectedLegalSlug(item.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  selectedLegalSlug === item.slug
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Titre du document</label>
                <input
                  type="text"
                  value={legalDraft.title}
                  onChange={(e) => setLegalDraft((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Date d'entrée en vigueur</label>
                <input
                  type="date"
                  value={legalDraft.effectiveDate}
                  onChange={(e) => setLegalDraft((p) => ({ ...p, effectiveDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(legalDraft.needsLegalReview)}
                  onChange={(e) =>
                    setLegalDraft((p) => ({ ...p, needsLegalReview: e.target.checked }))
                  }
                />
                <span>Afficher le bandeau « Document indicatif à faire valider par votre conseil juridique »</span>
              </label>
            </div>

            {/* Sections éditables */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white">Sections juridiques du document</h4>
              {legalDraft.sections.map((sec, idx) => (
                <div key={sec.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <input
                    type="text"
                    value={sec.heading}
                    onChange={(e) => {
                      const next = [...legalDraft.sections];
                      next[idx] = { ...sec, heading: e.target.value };
                      setLegalDraft((p) => ({ ...p, sections: next }));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold"
                  />
                  <textarea
                    rows={4}
                    value={sec.body}
                    onChange={(e) => {
                      const next = [...legalDraft.sections];
                      next[idx] = { ...sec, body: e.target.value };
                      setLegalDraft((p) => ({ ...p, sections: next }));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed"
                  />
                </div>
              ))}
            </div>

            {/* Coordonnées officielles de la société */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white">
                Identification officielle de l'entreprise (commune aux 3 pages légales)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Raison sociale"
                  value={companyMetaDraft.companyName}
                  onChange={(e) => setCompanyMetaDraft((p) => ({ ...p, companyName: e.target.value }))}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
                <input
                  type="text"
                  placeholder="Numéro RCCM"
                  value={companyMetaDraft.rccm}
                  onChange={(e) => setCompanyMetaDraft((p) => ({ ...p, rccm: e.target.value }))}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Id. Nat."
                  value={companyMetaDraft.idNat}
                  onChange={(e) => setCompanyMetaDraft((p) => ({ ...p, idNat: e.target.value }))}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="NIF"
                  value={companyMetaDraft.nif}
                  onChange={(e) => setCompanyMetaDraft((p) => ({ ...p, nif: e.target.value }))}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
                <input
                  type="email"
                  placeholder="Email DPO / Confidentialité"
                  value={companyMetaDraft.dpoEmail}
                  onChange={(e) => setCompanyMetaDraft((p) => ({ ...p, dpoEmail: e.target.value }))}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
                <input
                  type="text"
                  placeholder="Adresse siège social"
                  value={companyMetaDraft.headquartersAddress}
                  onChange={(e) =>
                    setCompanyMetaDraft((p) => ({ ...p, headquartersAddress: e.target.value }))
                  }
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingLegal}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingLegal ? 'Sauvegarde...' : 'Enregistrer les modifications légales'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
