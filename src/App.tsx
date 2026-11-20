import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { trackPageView, initAllTracking } from './utils/analytics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SearchWidget } from './components/SearchWidget';
import { PropertyCard } from './components/PropertyCard';
import { PropertyMap } from './components/PropertyMap';
import { AgentDirectory } from './components/AgentDirectory';
import { ShortcodesGallery } from './components/ShortcodesGallery';
import { UserDashboard } from './components/Dashboard/UserDashboard';
import { PropertyDetailPage } from './components/PropertyDetailPage';
import { getPropertySlug, resolvePropertyBySlugOrId } from './utils/shareUtils';
import { PropertyFormModal } from './components/PropertyFormModal';
import { FieldsBuilderModal } from './components/FieldsBuilder/FieldsBuilderModal';
import { CompareModal } from './components/CompareModal';
import { AuthModal } from './components/AuthModal';
import { AgentInviteModal } from './components/Dashboard/AgentInviteModal';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { SocialShareModal } from './components/SocialShareModal';
import { CompareDock } from './components/CompareDock';
import { AdminPortal } from './components/Admin/AdminPortal';
import { MonetizationPricingView } from './components/Monetization/MonetizationPricingView';
import { ArchitecturalHeroSlider } from './components/ArchitecturalHeroSlider';
import { VitrineSection } from './components/VitrineSection';
import { FloatingConciergeWidget } from './components/FloatingConciergeWidget';
import { ConciergeriePage } from './components/Conciergerie/ConciergeriePage';
import { VisitsReelsView } from './components/Visits/VisitsReelsView';
import { AgentDashboardView } from './components/Dashboard/AgentDashboardView';
import { AgencyDashboardView } from './components/Dashboard/AgencyDashboardView';
import { NeighborhoodPageView } from './components/Content/NeighborhoodPageView';
import { BlogGuidesView } from './components/Content/BlogGuidesView';
import { HelpFaqView } from './components/Content/HelpFaqView';
import { LegalPageView } from './components/Content/LegalPageView';
import {
  DEFAULT_FAQ_ITEMS,
  DEFAULT_LEGAL_DOCUMENTS,
  resolveNeighborhoodBySlug,
} from './data/contentSeed';
import { LegalDocumentSlug } from './types';
import {
  Home,
  Building2,
  Briefcase,
  MapPin,
  Grid,
  List,
  Map as MapIcon,
  Sparkles,
  SlidersHorizontal,
  Flame,
  ArrowUpDown,
  Zap,
  Bot,
  MessageSquareCode,
  Car,
  ShieldCheck,
  Compass,
  PlayCircle,
  Film,
  User as UserIcon,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    user,
    properties,
    filters,
    setFilters,
    setIsFieldsBuilderOpen,
    activePropertyModalId,
    setActivePropertyModalId,
    setIsSubmitPropertyOpen,
    setIsSecurityModalOpen,
    setIsAuthModalOpen,
    blogArticles,
    legalDocuments,
  } = useApp();

  const LEGAL_SLUGS: LegalDocumentSlug[] = [
    'conditions-utilisation',
    'confidentialite',
    'mentions-legales',
  ];

  const parsePathRoute = (pathname: string, search: string) => {
    const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';
    if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
      return { tab: 'admin', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
    }
    if (cleanPath === '/conciergerie' || cleanPath.startsWith('/conciergerie/')) {
      return { tab: 'conciergerie', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
    }
    if (cleanPath === '/visites' || cleanPath.startsWith('/visites/')) {
      return { tab: 'visites', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
    }
    if (cleanPath === '/agent-dashboard' || cleanPath.startsWith('/agent-dashboard/')) {
      return { tab: 'agent-dashboard', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
    }
    if (cleanPath === '/agency-dashboard' || cleanPath.startsWith('/agency-dashboard/')) {
      return { tab: 'agency-dashboard', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
    }
    const quartierMatch = cleanPath.match(/^\/quartiers\/([^/?#]+)/i);
    if (quartierMatch && quartierMatch[1]) {
      return {
        tab: 'neighborhood',
        neighborhoodSlug: decodeURIComponent(quartierMatch[1]),
        blogSlug: null as string | null,
        legalSlug: 'conditions-utilisation' as LegalDocumentSlug,
      };
    }
    if (cleanPath === '/blog') {
      return { tab: 'blog', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
    }
    const blogMatch = cleanPath.match(/^\/blog\/([^/?#]+)/i);
    if (blogMatch && blogMatch[1]) {
      return {
        tab: 'blog',
        neighborhoodSlug: 'gombe',
        blogSlug: decodeURIComponent(blogMatch[1]),
        legalSlug: 'conditions-utilisation' as LegalDocumentSlug,
      };
    }
    if (cleanPath === '/aide') {
      return { tab: 'aide', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
    }
    const legalCandidate = cleanPath.slice(1) as LegalDocumentSlug;
    if (LEGAL_SLUGS.includes(legalCandidate)) {
      return { tab: 'legal', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: legalCandidate };
    }
    const params = new URLSearchParams(search || '');
    const tab = params.get('tab');
    if (
      tab &&
      [
        'home',
        'visites',
        'map',
        'agents',
        'agencies',
        'shortcodes',
        'dashboard',
        'agent-dashboard',
        'agency-dashboard',
        'wishlist',
        'admin',
        'pricing',
        'conciergerie',
        'neighborhood',
        'blog',
        'aide',
        'legal',
      ].includes(tab)
    ) {
      return { tab, neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
    }
    return { tab: 'home', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };
  };

  const initialRoute =
    typeof window !== 'undefined'
      ? parsePathRoute(window.location.pathname, window.location.search)
      : { tab: 'home', neighborhoodSlug: 'gombe', blogSlug: null as string | null, legalSlug: 'conditions-utilisation' as LegalDocumentSlug };

  const [currentTab, setCurrentTab] = useState(initialRoute.tab);
  const [neighborhoodSlug, setNeighborhoodSlug] = useState(initialRoute.neighborhoodSlug);
  const [blogSlug, setBlogSlug] = useState<string | null>(initialRoute.blogSlug);
  const [legalSlug, setLegalSlug] = useState<LegalDocumentSlug>(initialRoute.legalSlug);
  const [sharePropertyId, setSharePropertyId] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  const navigateToPath = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const parsed = parsePathRoute(cleanPath, '');
    setActivePropertyModalId(null);
    setIsFieldsBuilderOpen(false);
    setNeighborhoodSlug(parsed.neighborhoodSlug);
    setBlogSlug(parsed.blogSlug);
    setLegalSlug(parsed.legalSlug);
    setCurrentTab(parsed.tab);
    if (typeof window !== 'undefined') {
      try {
        if (window.location.pathname !== cleanPath || window.location.search) {
          window.history.pushState({}, '', cleanPath);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    }
  };

  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const handleGoHome = () => {
    setActivePropertyModalId(null);
    setIsFieldsBuilderOpen(false);
    setBlogSlug(null);
    setCurrentTab('home');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('property');
      window.history.pushState({}, '', '/' + (url.search ? url.search : ''));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  };

  useEffect(() => {
    initAllTracking();

    const handleTabPopState = () => {
      try {
        const parsed = parsePathRoute(window.location.pathname, window.location.search);
        setNeighborhoodSlug(parsed.neighborhoodSlug);
        setBlogSlug(parsed.blogSlug);
        setLegalSlug(parsed.legalSlug);
        setCurrentTab(parsed.tab);
      } catch {}
    };

    window.addEventListener('popstate', handleTabPopState);
    return () => window.removeEventListener('popstate', handleTabPopState);
  }, []);

  // Strict role segregation: Agent never enters agency space, Agency never enters agent space, Admin stays in admin dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'agent' && currentTab === 'agency-dashboard') {
        setCurrentTab('agent-dashboard');
      } else if (user.role === 'agency' && currentTab === 'agent-dashboard') {
        setCurrentTab('agency-dashboard');
      } else if (user.role === 'admin' && (currentTab === 'agent-dashboard' || currentTab === 'agency-dashboard')) {
        setCurrentTab('dashboard');
      }
    }
  }, [user, currentTab]);

  useEffect(() => {
    const tabTitles: Record<string, string> = {
      home: 'Accueil - Annonces Immobilières Kinshasa',
      visites: 'Kinimmo Visites - Vidéos Immersives des Biens Immobiliers Kinshasa',
      map: 'Carte Interactive des Biens - Kinshasa',
      agents: 'Annuaire des Agents & Agences Immobilières',
      agencies: 'Agences Immobilières Agréées - Kinshasa',
      shortcodes: 'Galerie des Shortcodes & Widgets',
      dashboard: 'Tableau de Bord & Gestion Immobilière',
      'agent-dashboard': 'Tableau de Bord Agent Immobilier - Kinimmo',
      'agency-dashboard': 'Tableau de Bord Agence Immobilière - Kinimmo',
      wishlist: 'Mes Favoris Sauvegardés',
      pricing: 'Tarifs & Abonnements - Kinimmo',
      conciergerie: 'Conciergerie Immobilière - Votre recherche, notre accompagnement | Kinimmo',
      admin: 'Panneau d’Administration Sécurisé - Kinimmo',
      neighborhood: 'Immobilier par Quartier à Kinshasa - Kinimmo',
      blog: 'Blog & Guides Immobiliers RDC - Kinimmo',
      aide: 'Centre d’aide & FAQ - Kinimmo',
      legal: 'Informations Légales - Kinimmo RDC',
    };
    trackPageView(tabTitles[currentTab] || `Kinshasa Immo - ${currentTab}`, `/${currentTab}`);

    // Synchronisation des URLs propres
    if (typeof window !== 'undefined' && !activePropertyModalId) {
      try {
        const cleanPaths = [
          '/admin',
          '/conciergerie',
          '/visites',
          '/quartiers/',
          '/blog',
          '/aide',
          '/conditions-utilisation',
          '/confidentialite',
          '/mentions-legales',
        ];
        if (currentTab === 'admin' && !window.location.pathname.startsWith('/admin')) {
          window.history.pushState({}, '', '/admin');
        } else if (currentTab === 'conciergerie' && window.location.pathname !== '/conciergerie') {
          window.history.pushState({}, '', '/conciergerie');
        } else if (currentTab === 'visites' && window.location.pathname !== '/visites') {
          window.history.pushState({}, '', '/visites');
        } else if (currentTab === 'neighborhood') {
          const target = `/quartiers/${encodeURIComponent(neighborhoodSlug || 'gombe')}`;
          if (window.location.pathname !== target) window.history.pushState({}, '', target);
        } else if (currentTab === 'blog') {
          const target = blogSlug ? `/blog/${encodeURIComponent(blogSlug)}` : '/blog';
          if (window.location.pathname !== target) window.history.pushState({}, '', target);
        } else if (currentTab === 'aide' && window.location.pathname !== '/aide') {
          window.history.pushState({}, '', '/aide');
        } else if (currentTab === 'legal') {
          const target = `/${legalSlug}`;
          if (window.location.pathname !== target) window.history.pushState({}, '', target);
        } else if (
          !['admin', 'conciergerie', 'visites', 'neighborhood', 'blog', 'aide', 'legal'].includes(currentTab) &&
          cleanPaths.some((p) =>
            p.endsWith('/') ? window.location.pathname.startsWith(p) : window.location.pathname === p || window.location.pathname.startsWith(p + '/')
          )
        ) {
          window.history.pushState({}, '', '/');
        }
      } catch {}
    }
  }, [currentTab, neighborhoodSlug, blogSlug, legalSlug, activePropertyModalId]);

  // GESTION DYNAMIQUE DE LA CANONICALISATION, OPEN GRAPH & SCHEMA.ORG JSON-LD
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin;
    let canonicalUrl = `${origin}/`;
    let pageTitle = 'Kinshasa Immobilier - Plateforme Immobilière & Gestion RDC';
    let metaDescription = 'Portail immobilier de référence en RDC : Vente, location, gestion locative, terrains titrés et annuaire des agents certifiés à Kinshasa.';
    let structuredData: Record<string, any> | null = null;

    if (activePropertyModalId) {
      const activeProp = resolvePropertyBySlugOrId(activePropertyModalId, properties);
      if (activeProp) {
        canonicalUrl = `${origin}/annonces/${encodeURIComponent(getPropertySlug(activeProp))}`;
        pageTitle = `${activeProp.title} à ${activeProp.commune || 'Kinshasa'} - Kinimmo`;
        if (activeProp.description) {
          metaDescription = `${activeProp.type === 'land' ? 'Terrain' : 'Bien'} à ${activeProp.commune || 'Kinshasa'}. ${activeProp.description.slice(0, 140)}...`;
        }
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'RealEstateListing',
          name: activeProp.title,
          description: activeProp.description,
          url: canonicalUrl,
          dateModified: activeProp.updatedAt || activeProp.createdAt,
          image: Array.isArray(activeProp.images) ? activeProp.images[0] : undefined,
          offers: {
            '@type': 'Offer',
            price: activeProp.price,
            priceCurrency: activeProp.currency || 'USD',
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: activeProp.commune || activeProp.city || 'Kinshasa',
            addressCountry: 'CD',
          },
        };
      }
    } else if (currentTab === 'neighborhood') {
      const profile = resolveNeighborhoodBySlug(neighborhoodSlug, properties);
      canonicalUrl = `${origin}/quartiers/${encodeURIComponent(profile?.slug || neighborhoodSlug)}`;
      pageTitle = profile
        ? `Immobilier à ${profile.name} (${profile.commune}) : prix et annonces | Kinimmo`
        : 'Quartiers immobiliers à Kinshasa | Kinimmo';
      metaDescription = profile
        ? `${profile.stats.activeCount} biens disponibles à ${profile.name}. ${profile.tagline}`
        : metaDescription;
      if (profile) {
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'Place',
          name: `${profile.name}, Kinshasa`,
          description: profile.description,
          url: canonicalUrl,
          address: {
            '@type': 'PostalAddress',
            addressLocality: profile.commune,
            addressRegion: 'Kinshasa',
            addressCountry: 'CD',
          },
        };
      }
    } else if (currentTab === 'blog') {
      const article = blogSlug
        ? blogArticles.find((a) => a.slug === blogSlug)
        : null;
      if (article) {
        canonicalUrl = `${origin}/blog/${encodeURIComponent(article.slug)}`;
        pageTitle = `${article.title} | Guides Kinimmo RDC`;
        metaDescription = article.excerpt;
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt,
          image: article.coverImage,
          author: { '@type': 'Organization', name: article.authorName || 'Rédaction Kinimmo RDC' },
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          mainEntityOfPage: canonicalUrl,
        };
      } else {
        canonicalUrl = `${origin}/blog`;
        pageTitle = 'Blog & Guides Immobiliers Kinshasa & RDC | Kinimmo';
        metaDescription = 'Guides pratiques sur les titres fonciers, l’investissement locatif et les communes stratégiques de Kinshasa.';
      }
    } else if (currentTab === 'aide') {
      canonicalUrl = `${origin}/aide`;
      pageTitle = 'Centre d’aide & Questions fréquentes (FAQ) | Kinimmo';
      metaDescription = 'Réponses sur la publication d’annonces, le paiement Mobile Money, les QR codes panneaux et la vérification Kinimmo Trust.';
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: DEFAULT_FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      };
    } else if (currentTab === 'legal') {
      const doc =
        legalDocuments.find((d) => d.slug === legalSlug) ||
        DEFAULT_LEGAL_DOCUMENTS.find((d) => d.slug === legalSlug);
      canonicalUrl = `${origin}/${legalSlug}`;
      pageTitle = doc ? `${doc.title} | Kinimmo RDC` : 'Mentions & Informations Légales | Kinimmo';
      metaDescription = doc ? doc.subtitle : metaDescription;
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: pageTitle,
        description: metaDescription,
        url: canonicalUrl,
      };
    } else if (currentTab === 'visites') {
      canonicalUrl = `${origin}/visites`;
      pageTitle = 'Kinimmo Visites - Vidéos Immersives des Biens Immobiliers Kinshasa';
      metaDescription = 'Découvrez les appartements et villas à Kinshasa en vidéos 30s immersives haute fidélité.';
    } else if (currentTab === 'conciergerie') {
      canonicalUrl = `${origin}/conciergerie`;
      pageTitle = 'Conciergerie Immobilière Kinshasa - Recherche sur-mesure & Visites | Kinimmo';
      metaDescription = 'Service de conciergerie VIP pour trouver et visiter votre bien immobilier à Kinshasa (Gombe, Ngaliema, Limete).';
    } else if (currentTab === 'map') {
      canonicalUrl = `${origin}/?tab=map`;
      pageTitle = 'Carte Interactive des Biens Immobiliers à Kinshasa | Kinimmo';
      metaDescription = 'Carte interactive géolocalisée des biens à vendre et à louer à Kinshasa par commune et quartier.';
    } else if (currentTab === 'agents') {
      canonicalUrl = `${origin}/?tab=agents`;
      pageTitle = 'Annuaire des Agents Immobiliers Vérifiés à Kinshasa | Kinimmo';
      metaDescription = 'Trouvez un agent immobilier indépendant certifié et audité à Kinshasa avec badge Kinimmo Trust.';
    } else if (currentTab === 'agencies') {
      canonicalUrl = `${origin}/?tab=agencies`;
      pageTitle = 'Agences Immobilières Agréées à Kinshasa | Kinimmo';
      metaDescription = 'Répertoire des agences immobilières agréées avec licence officielle et collaborateurs certifiés.';
    } else if (currentTab === 'pricing') {
      canonicalUrl = `${origin}/?tab=pricing`;
      pageTitle = 'Tarifs & Abonnements Particuliers et Professionnels | Kinimmo';
      metaDescription = 'Formules gratuites et forfaits professionnels pour publier et booster vos biens à Kinshasa.';
    } else if (currentTab === 'home') {
      canonicalUrl = `${origin}/`;
    } else {
      canonicalUrl = `${origin}/?tab=${encodeURIComponent(currentTab)}`;
    }

    document.title = pageTitle;

    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', canonicalUrl);

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);
    const twTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', pageTitle);

    const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', metaDescription);
    const ogDescMeta = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDescMeta) ogDescMeta.setAttribute('content', metaDescription);
    const twDescMeta = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
    if (twDescMeta) twDescMeta.setAttribute('content', metaDescription);

    let dynamicKeywords = 'immobilier kinshasa, kinshasa immobilier, kinimmo, vente maison kinshasa, location appartement kinshasa, terrain avec certificat enregistrement kinshasa, villa ngaliema macampagne, gombe kinshasa, limete, mont ngafula';
    if (activePropertyModalId) {
      const activeProp = properties.find((p) => p.id === activePropertyModalId);
      if (activeProp) {
        const propTypeLabel = activeProp.type === 'apartment' ? 'appartement' : activeProp.type === 'house' ? 'maison villa' : activeProp.type === 'land' ? 'terrain parcelle concession' : activeProp.type === 'office' ? 'bureau espace commercial' : 'penthouse duplex';
        dynamicKeywords = `${propTypeLabel} kinshasa, ${activeProp.commune || 'kinshasa'} immobilier, ${activeProp.quartier || ''} kinshasa, ${activeProp.title}, ${activeProp.status === 'for-sale' ? 'vente achat' : 'location louer'}, cadastre titres fonciers rdc, certificat enregistrement kinshasa, ${dynamicKeywords}`;
      }
    }
    let kwMeta = document.querySelector<HTMLMetaElement>('meta[name="keywords"]');
    if (!kwMeta) {
      kwMeta = document.createElement('meta');
      kwMeta.setAttribute('name', 'keywords');
      document.head.appendChild(kwMeta);
    }
    kwMeta.setAttribute('content', dynamicKeywords);

    const existingLd = document.getElementById('kinimmo-listing-jsonld');
    if (structuredData) {
      const ldScript = existingLd || document.createElement('script');
      ldScript.setAttribute('type', 'application/ld+json');
      ldScript.setAttribute('id', 'kinimmo-listing-jsonld');
      ldScript.textContent = JSON.stringify(structuredData);
      if (!existingLd) {
        document.head.appendChild(ldScript);
      }
    } else if (existingLd) {
      existingLd.remove();
    }
  }, [currentTab, activePropertyModalId, properties, neighborhoodSlug, blogSlug, legalSlug, blogArticles, legalDocuments]);

  // Filter Properties Logic - Recherche multi-termes ultra-performante par mots-clés
  const filteredProperties = properties.filter((p) => {
    // Multi-token search matching across title, description, commune, quartier, avenue, amenities, trust_level & cadastre
    if (filters.searchQuery) {
      const query = filters.searchQuery.trim().toLowerCase();
      const tokens = query.split(/\s+/).filter(Boolean);

      // Concatenate all property searchable data
      const amenitiesText = Array.isArray(p.amenities) ? p.amenities.join(' ').toLowerCase() : '';
      const customFieldsText = p.customFields ? Object.values(p.customFields).filter(v => typeof v === 'string' || typeof v === 'number').join(' ').toLowerCase() : '';
      const cadastreText = (p as any).cadastre_data ? Object.values((p as any).cadastre_data).join(' ').toLowerCase() : '';
      const searchableCorpus = [
        p.title,
        p.description || '',
        p.type || '',
        p.city || '',
        p.address || '',
        p.commune || '',
        p.quartier || '',
        p.avenue || '',
        p.referencePoint || '',
        p.trust_level || '',
        amenitiesText,
        customFieldsText,
        cadastreText
      ].join(' ').toLowerCase();

      // Every search token must match somewhere in the property's data (AND matching)
      const allTokensMatch = tokens.every(token => searchableCorpus.includes(token));
      if (!allTokensMatch) {
        return false;
      }
    }

    // Commune Filter
    if (filters.commune && filters.commune !== 'all') {
      const targetCommune = filters.commune.toLowerCase();
      const propCommune = (p.commune || '').toLowerCase();
      const propAddress = (p.address || '').toLowerCase();
      if (!propCommune.includes(targetCommune) && !propAddress.includes(targetCommune)) {
        return false;
      }
    }

    // Quartier Filter
    if (filters.quartier && filters.quartier !== 'all') {
      const targetQuartier = filters.quartier.toLowerCase();
      const propQuartier = (p.quartier || '').toLowerCase();
      const propAddress = (p.address || '').toLowerCase();
      if (!propQuartier.includes(targetQuartier) && !propAddress.includes(targetQuartier)) {
        return false;
      }
    }

    // Avenue Filter
    if (filters.avenue) {
      const targetAvenue = filters.avenue.toLowerCase();
      const propAvenue = (p.avenue || '').toLowerCase();
      const propAddress = (p.address || '').toLowerCase();
      if (!propAvenue.includes(targetAvenue) && !propAddress.includes(targetAvenue)) {
        return false;
      }
    }

    // Type Filter
    if (filters.type && filters.type !== 'all' && p.type !== filters.type) {
      return false;
    }

    // Status Filter
    if (filters.status && filters.status !== 'all') {
      if (p.status !== filters.status) {
        return false;
      }
    } else {
      // By default on the home screen feed, sold properties automatically disappear so only available properties are shown
      if (p.status === 'sold') {
        return false;
      }
    }

    // Max Price
    if (filters.maxPrice && p.price > filters.maxPrice) {
      return false;
    }

    // Min Bedrooms
    if (filters.minBedrooms && p.bedrooms < filters.minBedrooms) {
      return false;
    }

    // Min Area
    if (filters.minArea && p.area < filters.minArea) {
      return false;
    }

    // Custom Fields Filters
    if (filters.customFields && Object.keys(filters.customFields).length > 0) {
      for (const [key, val] of Object.entries(filters.customFields)) {
        if (val) {
          const propVal = p.customFields?.[key];
          if (!propVal || !String(propVal).toLowerCase().includes(String(val).toLowerCase())) {
            return false;
          }
        }
      }
    }

    return true;
  });

  // Sorting Logic
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (filters.sortBy === 'price-asc') return a.price - b.price;
    if (filters.sortBy === 'price-desc') return b.price - a.price;
    if (filters.sortBy === 'popular') return b.viewsCount - a.viewsCount;
    if (filters.sortBy === 'area-desc') return b.area - a.area;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // default newest
  });

  const propertyToShare = properties.find((p) => p.id === sharePropertyId) || null;

  // Page dédiée d'une annonce (/annonces/:slug) — remplace l'ancienne fenêtre superposée
  if (activePropertyModalId) {
    return (
      <>
        <PropertyDetailPage
          propertyIdOrSlug={activePropertyModalId}
          onBackHome={() => setActivePropertyModalId(null)}
          onOpenShareModal={(id) => setSharePropertyId(id)}
          onOpenNeighborhood={(slug) => navigateToPath(`/quartiers/${slug}`)}
        />
        <PropertyFormModal />
        <FieldsBuilderModal />
        <CompareModal />
        <AuthModal />
        <AgentInviteModal />
        <SecuritySettingsModal />
        <SocialShareModal property={propertyToShare} onClose={() => setSharePropertyId(null)} />
      </>
    );
  }

  // Si l'utilisateur est sur la route ou l'onglet d'administration /admin
  if (currentTab === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
        <AdminPortal onReturnHome={handleGoHome} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden w-full max-w-full">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center fixed top-16 left-0 right-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onNavigatePath={navigateToPath}
      />

      <main className={`flex-1 w-full pt-16 ${currentTab === 'conciergerie' || currentTab === 'visites' ? '' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8'} pb-24 lg:pb-12 space-y-6 sm:space-y-8`}>
        {/* TAB 1: HOME / PROPERTY LISTINGS */}
        {currentTab === 'home' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Interactive Luxury Architectural Showcase Slider (Safricode Kinshasa Style) */}
            <ArchitecturalHeroSlider
              onExploreCommune={(commune) => {
                setFilters((prev) => ({ ...prev, commune, searchQuery: '' }));
              }}
              onNavigateToAgencies={() => setCurrentTab('agents')}
            />

            {/* Bannière Découverte Format TikTok : Visites Vidéo 30s Kinshasa */}
            <div
              onClick={() => {
                setCurrentTab('visites');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-emerald-500/40 p-4 sm:p-6 shadow-xl cursor-pointer group hover:border-emerald-400 transition-all active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                      Nouveau Format Vidéo
                    </span>
                    <span className="text-xs text-emerald-400 font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Comme sur TikTok
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                    Visites Vidéo 30s de Biens Immobiliers
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
                    Faites défiler les vidéos réelles de biens titrés à Kinshasa (Gombe, Ngaliema, Limete) avec prix en USD et Francs Congolais, commune et bouton WhatsApp direct vers l'agent.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all cursor-pointer">
                    <PlayCircle className="w-4.5 h-4.5 fill-slate-950 text-emerald-500" />
                    <span>Lancer les Visites Vidéo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Widget - Direct et Simple */}
            <SearchWidget />

            {/* SECTION VITRINE OFFICIELLE KINIMMO - Biens Validés & Mises en Avant Actives */}
            <VitrineSection
              properties={properties}
              onSelectProperty={(prop) => setActivePropertyModalId(prop.id)}
              onExploreCatalog={() => {
                const el = document.getElementById('properties-catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Results Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-sm">
              <div className="font-semibold text-slate-700">
                <span className="text-emerald-600 font-black text-base">{sortedProperties.length}</span> propriétés disponibles
              </div>

              <div className="flex items-center gap-3 ms-auto">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  <select
                    value={filters.sortBy || 'newest'}
                    onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                    className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-semibold"
                  >
                    <option value="newest">Plus récentes</option>
                    <option value="price-asc">Prix (Croissant)</option>
                    <option value="price-desc">Prix (Décroissant)</option>
                    <option value="popular">Plus vues</option>
                    <option value="area-desc">Surface (Décroissant)</option>
                  </select>
                </div>

                {/* Bouton Conciergerie Immobilière */}
                <button
                  onClick={() => {
                    setCurrentTab('conciergerie');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                  title="Accompagnement Conciergerie Immobilière Kinimmo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Conciergerie</span>
                </button>
              </div>
            </div>

            {/* Grille des Propriétés Disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProperties.map((property) => (
                <PropertyCard key={property.id} property={property} onShare={(id) => setSharePropertyId(id)} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 1B: VISITES VERTICALES REELS TIKTOK */}
        {currentTab === 'visites' && (
          <VisitsReelsView
            onReturnHome={handleGoHome}
            onOpenPropertyModal={(id) => setActivePropertyModalId(id)}
            onOpenShareModal={(id) => setSharePropertyId(id)}
          />
        )}

        {/* TAB 2: INTERACTIVE MAP AJAX */}
        {currentTab === 'map' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                  <Compass className="w-4 h-4" />
                  <span>Cartographie Urbaine & Immobilière Intelligente</span>
                </div>
                <h2 className="text-xl font-black text-white">
                  Kinshasa Urban Intelligence & Immobilier
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Explorez les prix & loyers moyens, écoles, hôpitaux, marchés, boulevards majeurs, scores de sécurité, eau, électricité et calculateur de temps de route vers l'Aéroport et le centre-ville.
                </p>
              </div>
              <button
                onClick={handleGoHome}
                className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer border border-slate-700"
                title="Retourner à la page d'accueil"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Retour Accueil</span>
              </button>
            </div>
            <SearchWidget />
            <PropertyMap properties={sortedProperties} height="h-[740px]" />
          </div>
        )}

        {/* TAB 3: AGENTS DIRECTORY */}
        {currentTab === 'agents' && <AgentDirectory initialTab="agents" onReturnHome={handleGoHome} />}

        {/* TAB 3B: AGENCIES DIRECTORY */}
        {currentTab === 'agencies' && <AgentDirectory initialTab="agencies" onReturnHome={handleGoHome} />}

        {/* TAB 4: WIDGETS & SHORTCODES */}
        {currentTab === 'shortcodes' && <ShortcodesGallery onReturnHome={handleGoHome} />}

        {/* TAB 5: GENERAL DASHBOARD / ADMIN PANEL */}
        {(currentTab === 'dashboard' || currentTab === 'admin') && (
          !user ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <UserIcon className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase">
                  Accès Réservé
                </span>
                <h3 className="text-2xl font-black text-white">Connexion Requise</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Le tableau de bord est accessible uniquement après authentification. Veuillez vous connecter pour accéder à vos annonces et outils.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                >
                  Se Connecter
                </button>
              </div>
            </div>
          ) : (
            <UserDashboard onReturnHome={handleGoHome} />
          )
        )}

        {/* TAB 5B: STANDALONE AGENT DASHBOARD */}
        {currentTab === 'agent-dashboard' && (
          !user ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <Briefcase className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase">
                  Accès Professionnel
                </span>
                <h3 className="text-2xl font-black text-white">Connexion Agent Requise</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Veuillez vous connecter à votre compte professionnel pour accéder à vos annonces, vidéos et prospects.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                >
                  Se Connecter
                </button>
              </div>
            </div>
          ) : user.role !== 'agent' ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-amber-500/30 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black uppercase">
                  Accès Réservé aux Agents
                </span>
                <h3 className="text-2xl font-black text-white">Espace Non Autorisé</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {user.role === 'admin'
                    ? "En tant qu'administrateur, votre espace de gestion et de gouvernance se trouve dans votre panneau d'administration."
                    : "Votre compte est un compte Agence Immobilière. Vous ne pouvez pas accéder à l'Espace Agent individuel."}
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {user.role === 'admin' ? (
                  <button
                    onClick={() => setCurrentTab('dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Aller au Panneau Administrateur
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentTab('agency-dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Aller à mon Espace Agence
                  </button>
                )}
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-emerald-500/30 p-5 rounded-3xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-md">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">Tableau de Bord Agent Immobilier</h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                        Espace Indépendant
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Vos mandats personnels, vidéos haute fidélité, prospects directs et calendrier de visites
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleGoHome}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Retourner à l'accueil"
                  >
                    <Home className="w-4 h-4 text-emerald-400" />
                    <span>Accueil</span>
                  </button>
                </div>
              </div>

              <AgentDashboardView
                onOpenSubmitProperty={() => setIsSubmitPropertyOpen(true)}
                onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
              />
            </div>
          )
        )}

        {/* TAB 5C: STANDALONE AGENCY DASHBOARD */}
        {currentTab === 'agency-dashboard' && (
          !user ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-black uppercase">
                  Accès Direction
                </span>
                <h3 className="text-2xl font-black text-white">Connexion Agence Requise</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Veuillez vous connecter avec votre compte agence agréée pour gérer vos collaborateurs et mandats.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                >
                  Se Connecter
                </button>
              </div>
            </div>
          ) : user.role !== 'agency' ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-amber-500/30 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black uppercase">
                  Accès Réservé aux Agences
                </span>
                <h3 className="text-2xl font-black text-white">Espace Non Autorisé</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {user.role === 'admin'
                    ? "En tant qu'administrateur, votre espace de gestion et de gouvernance se trouve dans votre panneau d'administration."
                    : "Votre compte est un compte Agent Indépendant. Vous ne pouvez pas accéder à l'Espace Agence de direction."}
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {user.role === 'admin' ? (
                  <button
                    onClick={() => setCurrentTab('dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Aller au Panneau Administrateur
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentTab('agent-dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Aller à mon Espace Agent
                  </button>
                )}
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-indigo-500/30 p-5 rounded-3xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">Tableau de Bord Agence Immobilière</h2>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">
                        Direction & Équipe
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Gestion des collaborateurs, attribution des biens & leads, pipeline des transactions et label Kinimmo Trust
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleGoHome}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Retourner à l'accueil"
                  >
                    <Home className="w-4 h-4 text-emerald-400" />
                    <span>Accueil</span>
                  </button>
                </div>
              </div>

              <AgencyDashboardView
                onOpenSubmitProperty={() => setIsSubmitPropertyOpen(true)}
                onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
              />
            </div>
          )
        )}

        {/* TAB 6: WISHLIST */}
        {currentTab === 'wishlist' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-between shadow-sm">
              <span className="font-bold text-slate-900 text-lg">Mes Favoris Enregistrés</span>
              <button
                onClick={handleGoHome}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                title="Retourner à la page d'accueil"
              >
                <Home className="w-4 h-4 text-emerald-600" />
                <span>Retour Accueil</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {properties
                .filter((p) => sortedProperties.map((sp) => sp.id).includes(p.id))
                .map((p) => (
                  <PropertyCard key={p.id} property={p} onShare={(id) => setSharePropertyId(id)} />
                ))}
            </div>
          </div>
        )}

        {/* TAB 7: TARIFS & ABONNEMENTS */}
        {currentTab === 'pricing' && <MonetizationPricingView />}

        {/* TAB 8: CONCIERGERIE IMMOBILIÈRE */}
        {currentTab === 'conciergerie' && (
          <ConciergeriePage
            onReturnHome={handleGoHome}
            onExploreProperties={() => {
              setCurrentTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* TAB 9: PAGES DE QUARTIER (/quartiers/:slug) */}
        {currentTab === 'neighborhood' && (
          <NeighborhoodPageView
            slug={neighborhoodSlug}
            onSelectNeighborhood={(slug) => navigateToPath(`/quartiers/${slug}`)}
            onReturnHome={handleGoHome}
            onOpenShare={(id) => setSharePropertyId(id)}
            onOpenConciergerie={() => navigateToPath('/conciergerie')}
          />
        )}

        {/* TAB 10: BLOG & GUIDES IMMOBILIERS (/blog et /blog/:slug) */}
        {currentTab === 'blog' && (
          <BlogGuidesView
            articleSlug={blogSlug}
            onSelectArticle={(slug) => navigateToPath(slug ? `/blog/${slug}` : '/blog')}
            onSelectNeighborhood={(slug) => navigateToPath(`/quartiers/${slug}`)}
            onReturnHome={handleGoHome}
          />
        )}

        {/* TAB 11: CENTRE D'AIDE & QUESTIONS FRÉQUENTES (/aide) */}
        {currentTab === 'aide' && (
          <HelpFaqView
            onReturnHome={handleGoHome}
            onOpenConciergerie={() => navigateToPath('/conciergerie')}
          />
        )}

        {/* TAB 12: PAGES LÉGALES (/conditions-utilisation, /confidentialite, /mentions-legales) */}
        {currentTab === 'legal' && (
          <LegalPageView
            slug={legalSlug}
            onSelectLegalSlug={(slug) => navigateToPath(`/${slug}`)}
            onReturnHome={handleGoHome}
          />
        )}
      </main>

      {/* Global Floating Interactive Controls & Modals */}
      <FloatingConciergeWidget
        onNavigateToConciergerie={() => {
          setCurrentTab('conciergerie');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Global Modals */}
      <PropertyFormModal />
      <FieldsBuilderModal />
      <CompareModal />
      <AuthModal />
      <AgentInviteModal />
      <SecuritySettingsModal />
      <SocialShareModal property={propertyToShare} onClose={() => setSharePropertyId(null)} />

      <Footer onNavigate={navigateToPath} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
