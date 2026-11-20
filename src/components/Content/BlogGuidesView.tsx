import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Home,
  MessageCircle,
  Search,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BLOG_CATEGORY_LABELS, slugifyText } from '../../data/contentSeed';
import { BlogArticle, BlogCategory } from '../../types';

interface BlogGuidesViewProps {
  articleSlug?: string | null;
  onSelectArticle: (slug: string | null) => void;
  onSelectNeighborhood: (slug: string) => void;
  onReturnHome: () => void;
}

function renderFormattedContent(content: string) {
  const blocks = String(content || '')
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    if (block.startsWith('## ')) {
      return (
        <h2
          key={index}
          className="text-xl sm:text-2xl font-extrabold text-slate-900 pt-4 pb-1 tracking-tight"
        >
          {block.replace(/^##\s+/, '')}
        </h2>
      );
    }

    const lines = block.split('\n');
    const isList = lines.every((l) => l.trim().startsWith('- ') || /^\d+\.\s/.test(l.trim()));
    if (isList) {
      return (
        <ul key={index} className="space-y-2 pl-5 list-disc text-slate-700 leading-relaxed">
          {lines.map((line, i) => {
            const clean = line.trim().replace(/^-\s+|^\d+\.\s+/, '');
            const parts = clean.split(/(\*\*.*?\*\*)/g);
            return (
              <li key={i}>
                {parts.map((part, pIdx) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={pIdx} className="font-bold text-slate-900">
                      {part.slice(2, -2)}
                    </strong>
                  ) : (
                    <span key={pIdx}>{part}</span>
                  )
                )}
              </li>
            );
          })}
        </ul>
      );
    }

    const parts = block.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={index} className="text-slate-700 leading-relaxed text-base">
        {parts.map((part, pIdx) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={pIdx} className="font-bold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={pIdx}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export const BlogGuidesView: React.FC<BlogGuidesViewProps> = ({
  articleSlug,
  onSelectArticle,
  onSelectNeighborhood,
  onReturnHome,
}) => {
  const { blogArticles } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<'all' | BlogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedArticleLink, setCopiedArticleLink] = useState(false);

  const publishedArticles = useMemo(
    () => blogArticles.filter((a) => a.status === 'published'),
    [blogArticles]
  );

  const activeArticle: BlogArticle | null = useMemo(() => {
    if (!articleSlug) return null;
    return (
      publishedArticles.find((a) => a.slug === articleSlug || a.id === articleSlug) || null
    );
  }, [articleSlug, publishedArticles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedArticles.filter((a) => {
      if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [publishedArticles, selectedCategory, searchQuery]);

  const leadArticle = useMemo(() => {
    return (
      filteredArticles.find((a) => a.featured) ||
      filteredArticles[0] ||
      null
    );
  }, [filteredArticles]);

  const secondaryArticles = useMemo(() => {
    if (!leadArticle) return [];
    return filteredArticles.filter((a) => a.id !== leadArticle.id);
  }, [filteredArticles, leadArticle]);

  if (activeArticle) {
    const articleUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/blog/${encodeURIComponent(activeArticle.slug)}`
        : '';
    const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `${activeArticle.title} — Guide Kinimmo : ${articleUrl}`
    )}`;
    const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`;

    const handleCopy = () => {
      try {
        navigator.clipboard.writeText(articleUrl);
        setCopiedArticleLink(true);
        setTimeout(() => setCopiedArticleLink(false), 2500);
      } catch {}
    };

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSelectArticle(null)}
            className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tous les guides</span>
          </button>

          <button
            type="button"
            onClick={onReturnHome}
            className="h-9 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Catalogue biens</span>
          </button>
        </div>

        <article className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          {activeArticle.coverImage && (
            <div className="aspect-[16/8] bg-slate-100 overflow-hidden">
              <img
                src={activeArticle.coverImage}
                alt={activeArticle.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 sm:p-10 space-y-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="text-emerald-700 font-semibold">
                  {BLOG_CATEGORY_LABELS[activeArticle.category]}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeArticle.publishedAt}</span>
                <span aria-hidden="true">·</span>
                <span>{activeArticle.readTimeMinutes} min de lecture</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight text-balance">
                {activeArticle.title}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {activeArticle.excerpt}
              </p>

              <div className="text-xs text-slate-500 pt-1">
                Par <strong className="text-slate-900">{activeArticle.authorName}</strong>
                {activeArticle.authorRole ? ` · ${activeArticle.authorRole}` : ''}
              </div>
            </div>

            {/* Barre de partage article */}
            <div className="py-3 border-y border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Partager ce guide :</span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={fbHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Facebook</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedArticleLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedArticleLink ? 'Copié' : 'Copier le lien'}</span>
                </button>
              </div>
            </div>

            {/* Colonne de lecture confortable 65-75ch */}
            <div className="max-w-2xl space-y-4">
              {renderFormattedContent(activeArticle.content)}
            </div>

            {/* Lien vers quartier associé & autres guides */}
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {activeArticle.relatedCommune ? (
                <button
                  type="button"
                  onClick={() => onSelectNeighborhood(slugifyText(activeArticle.relatedCommune || 'gombe'))}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Voir les annonces à {activeArticle.relatedCommune} →
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={() => onSelectArticle(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Lire d’autres guides
              </button>
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Magazine & Guides Pratiques RDC
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
            Blog & Guides Immobiliers Kinshasa
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Vérification des titres fonciers, rédaction du bail, comparatif des communes et conseils pour acheter, louer ou investir en toute sécurité.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnHome}
          className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour au catalogue</span>
        </button>
      </div>

      {/* Filtres de catégories & recherche */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous ({publishedArticles.length})
          </button>
          {(Object.keys(BLOG_CATEGORY_LABELS) as BlogCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {BLOG_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un guide..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Niveau 1 : Guide à la une */}
      {leadArticle && (
        <article
          onClick={() => onSelectArticle(leadArticle.slug)}
          className="bg-white border border-slate-200 hover:border-emerald-500/60 rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch cursor-pointer transition-colors"
        >
          <div className="lg:col-span-6 aspect-[16/10] lg:aspect-auto bg-slate-100 overflow-hidden">
            <img
              src={leadArticle.coverImage}
              alt={leadArticle.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-emerald-700">À la une</span>
                <span aria-hidden="true">·</span>
                <span>{BLOG_CATEGORY_LABELS[leadArticle.category]}</span>
                <span aria-hidden="true">·</span>
                <span>{leadArticle.readTimeMinutes} min</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 leading-snug text-balance">
                {leadArticle.title}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{leadArticle.excerpt}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {leadArticle.authorName} · {leadArticle.publishedAt}
              </span>
              <span className="font-bold text-emerald-700">Lire le guide →</span>
            </div>
          </div>
        </article>
      )}

      {/* Niveau 2 : Grille des articles et guides */}
      {secondaryArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {secondaryArticles.map((article) => (
            <article
              key={article.id}
              onClick={() => onSelectArticle(article.slug)}
              className="bg-white border border-slate-200 hover:border-emerald-500/60 rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer transition-colors"
            >
              <div>
                <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-emerald-700">
                      {BLOG_CATEGORY_LABELS[article.category]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{article.readTimeMinutes} min</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 truncate">{article.publishedAt}</span>
                <span className="font-bold text-emerald-700 shrink-0">Lire →</span>
              </div>
            </article>
          ))}
        </div>
      ) : !leadArticle ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-900">Aucun guide trouvé pour cette recherche.</p>
        </div>
      ) : null}
    </div>
  );
};
