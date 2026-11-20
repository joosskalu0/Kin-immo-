import React, { useMemo } from 'react';
import { AlertTriangle, ArrowLeft, Building2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_LEGAL_COMPANY_META, DEFAULT_LEGAL_DOCUMENTS } from '../../data/contentSeed';
import { LegalDocumentSlug } from '../../types';

interface LegalPageViewProps {
  slug: LegalDocumentSlug;
  onSelectLegalSlug: (slug: LegalDocumentSlug) => void;
  onReturnHome: () => void;
}

export const LegalPageView: React.FC<LegalPageViewProps> = ({
  slug,
  onSelectLegalSlug,
  onReturnHome,
}) => {
  const { legalDocuments } = useApp();

  const doc = useMemo(() => {
    return (
      legalDocuments.find((d) => d.slug === slug) ||
      DEFAULT_LEGAL_DOCUMENTS.find((d) => d.slug === slug) ||
      DEFAULT_LEGAL_DOCUMENTS[0]
    );
  }, [legalDocuments, slug]);

  const companyMeta = doc.companyMeta || DEFAULT_LEGAL_COMPANY_META;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
          {(
            [
              { slug: 'conditions-utilisation', label: "Conditions d'utilisation" },
              { slug: 'confidentialite', label: 'Confidentialité' },
              { slug: 'mentions-legales', label: 'Mentions légales' },
            ] as const
          ).map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => onSelectLegalSlug(item.slug)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                doc.slug === item.slug
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onReturnHome}
          className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour Accueil</span>
        </button>
      </div>

      {/* Bandeau obligatoire de validation juridique */}
      {doc.needsLegalReview && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-0.5">
            <p className="font-bold">Texte indicatif à faire valider par votre conseil juridique</p>
            <p className="text-amber-900 leading-relaxed">{doc.legalReviewNotice}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Contenu principal du document légal */}
        <article className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 space-y-6">
          <header className="space-y-2 pb-5 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Cadre juridique RDC</span>
              <span aria-hidden="true">·</span>
              <span>Entrée en vigueur : {doc.effectiveDate}</span>
              <span aria-hidden="true">·</span>
              <span>Mis à jour : {doc.updatedAt}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {doc.title}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">{doc.subtitle}</p>
          </header>

          <div className="space-y-7 max-w-2xl">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {section.heading}
                </h2>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </article>

        {/* Colonne latérale : Sommaire + Identification officielle */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sommaire du document
            </h2>
            <ul className="space-y-2 text-xs">
              {doc.sections.map((sec) => (
                <li key={sec.id}>
                  <a
                    href={`#${sec.id}`}
                    className="text-slate-700 hover:text-emerald-700 font-medium hover:underline block"
                  >
                    {sec.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Identification de l’éditeur</span>
            </div>
            <dl className="space-y-2">
              <div>
                <dt className="text-slate-500">Raison sociale</dt>
                <dd className="font-bold text-slate-900">{companyMeta.companyName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Forme juridique</dt>
                <dd className="text-slate-800">{companyMeta.legalForm}</dd>
              </div>
              <div>
                <dt className="text-slate-500">RCCM</dt>
                <dd className="font-mono text-slate-900">{companyMeta.rccm}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Id. Nat. / NIF</dt>
                <dd className="font-mono text-slate-900">
                  {companyMeta.idNat} · {companyMeta.nif}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Siège social</dt>
                <dd className="text-slate-800">{companyMeta.headquartersAddress}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Directeur de publication</dt>
                <dd className="text-slate-800">{companyMeta.publicationDirector}</dd>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <a href={`mailto:${companyMeta.contactEmail}`} className="hover:underline truncate">
                    {companyMeta.contactEmail}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">DPO : {companyMeta.dpoEmail}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{companyMeta.supportPhone}</span>
                </div>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
};
