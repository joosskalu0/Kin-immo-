import { LegalDocumentSlug } from '../types';

export type AppPageTab =
  | 'home'
  | 'search'
  | 'map'
  | 'wishlist'
  | 'compare'
  | 'alerts'
  | 'account'
  | 'security'
  | 'auth'
  | 'publish'
  | 'pro'
  | 'boost'
  | 'visites'
  | 'agencies'
  | 'agents'
  | 'conciergerie'
  | 'pricing'
  | 'neighborhood'
  | 'blog'
  | 'aide'
  | 'legal'
  | 'admin'
  | 'shortcodes'
  | 'offline';

export type ProSectionTab = 'today' | 'listings' | 'leads' | 'visits' | 'more';

export type AuthPageView = 'login' | 'register' | 'verify_email' | 'forgot_password' | 'reset_password';

export interface ParsedAppRoute {
  tab: AppPageTab;
  authView: AuthPageView;
  authToken: string | null;
  proSection: ProSectionTab;
  proSubSection: string | null;
  adminSection: string | null;
  editPropertyId: string | null;
  boostPropertyId: string | null;
  boostInvoiceId: string | null;
  boostOptionId: string | null;
  propertySlugOrId: string | null;
  neighborhoodSlug: string;
  blogSlug: string | null;
  legalSlug: LegalDocumentSlug;
  searchParams: {
    q?: string;
    commune?: string;
    type?: string;
    status?: string;
  };
}

const LEGAL_SLUGS: LegalDocumentSlug[] = [
  'conditions-utilisation',
  'confidentialite',
  'mentions-legales',
];

export const KINIMMO_NAV_EVENT = 'kinimmo:navigate';

export function dispatchAppNavigate(path: string, replace = false) {
  if (typeof window === 'undefined') return;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  window.dispatchEvent(
    new CustomEvent(KINIMMO_NAV_EVENT, {
      detail: { path: cleanPath, replace },
    })
  );
}

export function goBackOrFallback(fallbackPath = '/', onNavigate?: (path: string) => void) {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back();
    return;
  }
  if (onNavigate) {
    onNavigate(fallbackPath);
  } else {
    dispatchAppNavigate(fallbackPath, true);
  }
}

export function parseAppRoute(pathname: string, search = ''): ParsedAppRoute {
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search || '');

  const base: ParsedAppRoute = {
    tab: 'home',
    authView: 'login',
    authToken: params.get('token'),
    proSection: 'today',
    proSubSection: null,
    adminSection: null,
    editPropertyId: null,
    boostPropertyId: params.get('propertyId') || null,
    boostInvoiceId: params.get('invoiceId') || null,
    boostOptionId: params.get('optionId') || null,
    propertySlugOrId: null,
    neighborhoodSlug: 'gombe',
    blogSlug: null,
    legalSlug: 'conditions-utilisation',
    searchParams: {
      q: params.get('q') || undefined,
      commune: params.get('commune') || undefined,
      type: params.get('type') || undefined,
      status: params.get('status') || undefined,
    },
  };

  // Annonce détaillée : /annonces/:slug ou ?property=...
  const annonceMatch = cleanPath.match(/^\/annonces\/([^/?#]+)/i);
  if (annonceMatch && annonceMatch[1]) {
    base.propertySlugOrId = decodeURIComponent(annonceMatch[1]);
    return base;
  }
  const legacyPropParam = params.get('property');
  if (legacyPropParam) {
    base.propertySlugOrId = legacyPropParam;
    return base;
  }

  // Admin : /admin et /admin/:section
  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
    const sub = cleanPath === '/admin' ? null : cleanPath.slice('/admin/'.length);
    return { ...base, tab: 'admin', adminSection: sub };
  }

  // Parcours Boost dédié par URL : /pro/boost et /pro/boost/:propertyId
  if (cleanPath === '/pro/boost' || cleanPath.startsWith('/pro/boost/')) {
    const restId = cleanPath === '/pro/boost' ? null : decodeURIComponent(cleanPath.slice('/pro/boost/'.length));
    return {
      ...base,
      tab: 'boost',
      proSection: 'more',
      proSubSection: 'boosts',
      boostPropertyId: restId || params.get('propertyId') || null,
      boostInvoiceId: params.get('invoiceId') || null,
      boostOptionId: params.get('optionId') || null,
    };
  }

  // Espace Pro : /pro, /pro/annonces, /pro/prospects, /pro/visites, /pro/plus
  if (cleanPath === '/pro' || cleanPath.startsWith('/pro/')) {
    const rest = cleanPath === '/pro' ? '' : cleanPath.slice('/pro/'.length);
    const parts = rest.split('/').filter(Boolean);
    const head = (parts[0] || '').toLowerCase();
    let proSection: ProSectionTab = 'today';
    if (head === 'annonces') proSection = 'listings';
    else if (head === 'prospects') proSection = 'leads';
    else if (head === 'visites') proSection = 'visits';
    else if (head === 'plus') proSection = 'more';
    return {
      ...base,
      tab: 'pro',
      proSection,
      proSubSection: parts[1] || null,
    };
  }

  // Compatibilité anciennes routes Pro
  if (cleanPath === '/agent-dashboard' || cleanPath.startsWith('/agent-dashboard/')) {
    return { ...base, tab: 'pro', proSection: 'today' };
  }
  if (cleanPath === '/agency-dashboard' || cleanPath.startsWith('/agency-dashboard/')) {
    return { ...base, tab: 'pro', proSection: 'today' };
  }

  // Publier / Éditer : /publier et /publier/:id
  if (cleanPath === '/publier' || cleanPath.startsWith('/publier/')) {
    const editId = cleanPath === '/publier' ? null : decodeURIComponent(cleanPath.slice('/publier/'.length));
    return { ...base, tab: 'publish', editPropertyId: editId || null };
  }

  // Pages principales Public
  if (cleanPath === '/rechercher') return { ...base, tab: 'search' };
  if (cleanPath === '/carte') return { ...base, tab: 'map' };
  if (cleanPath === '/favoris') return { ...base, tab: 'wishlist' };
  if (cleanPath === '/comparer') return { ...base, tab: 'compare' };
  if (cleanPath === '/alertes' || cleanPath === '/notifications') return { ...base, tab: 'alerts' };
  if (cleanPath === '/connexion') return { ...base, tab: 'auth', authView: 'login' };
  if (cleanPath === '/inscription') return { ...base, tab: 'auth', authView: 'register' };
  if (cleanPath === '/confirmer-email') return { ...base, tab: 'auth', authView: 'verify_email', authToken: params.get('token') };
  if (cleanPath === '/mot-de-passe-oublie') return { ...base, tab: 'auth', authView: 'forgot_password' };
  if (cleanPath === '/reinitialiser-mot-de-passe') return { ...base, tab: 'auth', authView: 'reset_password', authToken: params.get('token') };
  if (cleanPath === '/compte') return { ...base, tab: 'account' };
  if (cleanPath === '/compte/securite') return { ...base, tab: 'security' };
  if (cleanPath === '/visites' || cleanPath.startsWith('/visites/')) return { ...base, tab: 'visites' };
  if (cleanPath === '/agences') return { ...base, tab: 'agencies' };
  if (cleanPath === '/agents') return { ...base, tab: 'agents' };
  if (cleanPath === '/conciergerie' || cleanPath.startsWith('/conciergerie/')) return { ...base, tab: 'conciergerie' };
  if (cleanPath === '/tarifs') return { ...base, tab: 'pricing' };

  const quartierMatch = cleanPath.match(/^\/quartiers\/([^/?#]+)/i);
  if (quartierMatch && quartierMatch[1]) {
    return { ...base, tab: 'neighborhood', neighborhoodSlug: decodeURIComponent(quartierMatch[1]) };
  }

  if (cleanPath === '/blog') return { ...base, tab: 'blog' };
  const blogMatch = cleanPath.match(/^\/blog\/([^/?#]+)/i);
  if (blogMatch && blogMatch[1]) {
    return { ...base, tab: 'blog', blogSlug: decodeURIComponent(blogMatch[1]) };
  }

  if (cleanPath === '/aide') return { ...base, tab: 'aide' };
  if (cleanPath === '/hors-ligne' || cleanPath === '/offline') return { ...base, tab: 'offline' };

  const legalCandidate = cleanPath.slice(1) as LegalDocumentSlug;
  if (LEGAL_SLUGS.includes(legalCandidate)) {
    return { ...base, tab: 'legal', legalSlug: legalCandidate };
  }

  // Rétrocompatibilité ?tab=...
  const legacyTab = params.get('tab');
  if (legacyTab) {
    const legacyMap: Record<string, AppPageTab> = {
      home: 'home',
      search: 'search',
      rechercher: 'search',
      map: 'map',
      wishlist: 'wishlist',
      favoris: 'wishlist',
      compare: 'compare',
      alerts: 'alerts',
      account: 'account',
      dashboard: 'account',
      'agent-dashboard': 'pro',
      'agency-dashboard': 'pro',
      pro: 'pro',
      visites: 'visites',
      agencies: 'agencies',
      agents: 'agents',
      conciergerie: 'conciergerie',
      pricing: 'pricing',
      neighborhood: 'neighborhood',
      blog: 'blog',
      aide: 'aide',
      legal: 'legal',
      admin: 'admin',
      shortcodes: 'shortcodes',
      offline: 'offline',
    };
    if (legacyMap[legacyTab]) {
      return { ...base, tab: legacyMap[legacyTab] };
    }
  }

  return base;
}

export function buildSearchPath(filters: {
  q?: string;
  commune?: string;
  type?: string;
  status?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.q && filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.commune && filters.commune !== 'all') params.set('commune', filters.commune);
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  const qs = params.toString();
  return qs ? `/rechercher?${qs}` : '/rechercher';
}

export function buildProPath(section: ProSectionTab, subSection?: string | null): string {
  if (section === 'today') return '/pro';
  if (section === 'listings') return '/pro/annonces';
  if (section === 'leads') return '/pro/prospects';
  if (section === 'visits') return '/pro/visites';
  if (section === 'more') return subSection ? `/pro/plus/${encodeURIComponent(subSection)}` : '/pro/plus';
  return '/pro';
}

export function buildBoostPath(
  propertyId?: string | null,
  opts?: { invoiceId?: string | null; optionId?: string | null }
): string {
  const basePath = propertyId ? `/pro/boost/${encodeURIComponent(propertyId)}` : '/pro/boost';
  const params = new URLSearchParams();
  if (opts?.invoiceId) params.set('invoiceId', opts.invoiceId);
  if (opts?.optionId) params.set('optionId', opts.optionId);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
