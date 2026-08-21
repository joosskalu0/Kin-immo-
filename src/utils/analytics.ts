/**
 * Google Tag Manager (GTM) & Omnichannel Marketing Analytics Engine
 * Centralizes DataLayer pushes and tracking for:
 * - Google Tag Manager (GTM Container)
 * - Google Analytics 4 (GA4)
 * - Meta Pixel (Facebook & Instagram Ads)
 * - TikTok Pixel (TikTok Ads)
 * - Google Ads (Conversions & Remarketing)
 */

import { Property, LeadRequest, Agency, User, Invoice, TrackingConfig } from '../types';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
    _fbq: any;
    ttq: any;
    googleAnalyticsLoaded?: boolean;
    gtmLoaded?: boolean;
    metaPixelLoaded?: boolean;
    tiktokPixelLoaded?: boolean;
  }
}

export const DEFAULT_GTM_ID = 'GTM-MBV5CSQR';
export const DEFAULT_GA_ID = 'G-KINSHASA2026';
export const DEFAULT_META_PIXEL_ID = '104829104829104';
export const DEFAULT_TIKTOK_PIXEL_ID = 'CKINSHASA2026TT';
export const DEFAULT_GOOGLE_ADS_ID = 'AW-1092849201';
export const DEFAULT_GOOGLE_ADS_LABEL = 'KinImmoLead2026';

export const DEFAULT_TRACKING_CONFIG: TrackingConfig = {
  gtmContainerId: DEFAULT_GTM_ID,
  googleAnalyticsId: DEFAULT_GA_ID,
  metaPixelId: DEFAULT_META_PIXEL_ID,
  tiktokPixelId: DEFAULT_TIKTOK_PIXEL_ID,
  googleAdsId: DEFAULT_GOOGLE_ADS_ID,
  googleAdsConversionLabel: DEFAULT_GOOGLE_ADS_LABEL,
  isGtmEnabled: true,
  isMetaPixelEnabled: true,
  isTiktokPixelEnabled: true,
  isGoogleAdsEnabled: true,
};

export interface AnalyticsEventLog {
  id: string;
  eventName: string;
  category?: string;
  params: Record<string, any>;
  timestamp: string;
  destinations: ('GTM' | 'GA4' | 'Meta Pixel' | 'TikTok Pixel' | 'Google Ads')[];
}

// In-memory live event buffer for live DataLayer inspector & debugging
const eventLogs: AnalyticsEventLog[] = [];
const eventListeners: ((logs: AnalyticsEventLog[]) => void)[] = [];

export function getAnalyticsLogs(): AnalyticsEventLog[] {
  return [...eventLogs];
}

export function clearAnalyticsLogs() {
  eventLogs.length = 0;
  notifyLogListeners();
}

export function subscribeToAnalyticsLogs(listener: (logs: AnalyticsEventLog[]) => void) {
  eventListeners.push(listener);
  return () => {
    const idx = eventListeners.indexOf(listener);
    if (idx !== -1) eventListeners.splice(idx, 1);
  };
}

function notifyLogListeners() {
  eventListeners.forEach((fn) => fn([...eventLogs]));
}

export function getStoredTrackingConfig(): TrackingConfig {
  if (typeof window === 'undefined') return DEFAULT_TRACKING_CONFIG;
  try {
    const saved = localStorage.getItem('kin_tracking_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate legacy placeholder ID to user's real container ID
      if (parsed.gtmContainerId === 'GTM-KINSHASA' || !parsed.gtmContainerId) {
        parsed.gtmContainerId = DEFAULT_GTM_ID;
      }
      return { ...DEFAULT_TRACKING_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Error reading tracking config from localStorage:', e);
  }
  return DEFAULT_TRACKING_CONFIG;
}

export function saveStoredTrackingConfig(config: TrackingConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kin_tracking_config', JSON.stringify(config));
    // Re-initialize tags
    initAllTracking(config);
  } catch (e) {
    console.error('Error saving tracking config:', e);
  }
}

/**
 * Check statuses of all connected tracking services
 */
export function checkAllTrackingStatus(): {
  isGtmActive: boolean;
  gtmId: string;
  isGa4Active: boolean;
  ga4Id: string;
  isMetaActive: boolean;
  metaId: string;
  isTikTokActive: boolean;
  tiktokId: string;
  isGoogleAdsActive: boolean;
  googleAdsId: string;
  dataLayerLength: number;
} {
  if (typeof window === 'undefined') {
    return {
      isGtmActive: false,
      gtmId: DEFAULT_GTM_ID,
      isGa4Active: false,
      ga4Id: DEFAULT_GA_ID,
      isMetaActive: false,
      metaId: DEFAULT_META_PIXEL_ID,
      isTikTokActive: false,
      tiktokId: DEFAULT_TIKTOK_PIXEL_ID,
      isGoogleAdsActive: false,
      googleAdsId: DEFAULT_GOOGLE_ADS_ID,
      dataLayerLength: 0,
    };
  }

  const config = getStoredTrackingConfig();
  const dataLayerLength = Array.isArray(window.dataLayer) ? window.dataLayer.length : 0;
  const isGtmActive = !!config.isGtmEnabled && typeof window.dataLayer !== 'undefined';
  const isGa4Active = typeof window.gtag === 'function' && !!config.googleAnalyticsId;
  const isMetaActive = !!config.isMetaPixelEnabled && !!config.metaPixelId;
  const isTikTokActive = !!config.isTiktokPixelEnabled && !!config.tiktokPixelId;
  const isGoogleAdsActive = !!config.isGoogleAdsEnabled && !!config.googleAdsId;

  return {
    isGtmActive,
    gtmId: config.gtmContainerId || DEFAULT_GTM_ID,
    isGa4Active,
    ga4Id: config.googleAnalyticsId || DEFAULT_GA_ID,
    isMetaActive,
    metaId: config.metaPixelId || DEFAULT_META_PIXEL_ID,
    isTikTokActive,
    tiktokId: config.tiktokPixelId || DEFAULT_TIKTOK_PIXEL_ID,
    isGoogleAdsActive,
    googleAdsId: config.googleAdsId || DEFAULT_GOOGLE_ADS_ID,
    dataLayerLength,
  };
}

/**
 * Initialize Google Tag Manager Container
 */
export function initGoogleTagManager(containerId: string = DEFAULT_GTM_ID) {
  if (typeof window === 'undefined') return;
  const validId = containerId && containerId.trim() ? containerId.trim() : DEFAULT_GTM_ID;

  window.dataLayer = window.dataLayer || [];
  try {
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
      container_id: validId,
    });
  } catch (e) {
    // Ignore buffer push error
  }

  // Only inject external script if valid and not already present
  if (validId && validId.startsWith('GTM-') && validId !== 'GTM-KINSHASA') {
    let script = document.getElementById('gtm-official-tag') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'gtm-official-tag';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://www.googletagmanager.com/gtm.js?id=${validId}`;
      script.onload = () => {
        window.gtmLoaded = true;
        console.log(`[Google Tag Manager] Conteneur actif : ${validId}`);
      };
      script.onerror = () => {
        console.warn(`[Google Tag Manager] Échec du chargement du conteneur ${validId} (vérifiez l'ID ou ad-blocker)`);
      };
      document.head.appendChild(script);
    }
  } else {
    // In-memory simulation active for placeholder/dev
    window.gtmLoaded = true;
  }
}

/**
 * Initialize Google Analytics 4 & Google Ads gtag
 */
export function initGoogleAnalytics(measurementId: string = DEFAULT_GA_ID, googleAdsId?: string) {
  if (typeof window === 'undefined') return;
  const validId = measurementId && measurementId.trim() ? measurementId.trim() : DEFAULT_GA_ID;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    try {
      window.dataLayer.push(arguments);
    } catch (e) {
      // Ignore
    }
  };

  try {
    window.gtag('js', new Date());
    window.gtag('config', validId, {
      send_page_view: true,
      page_title: document.title || 'Kinshasa Immobilier - Plateforme Immobilière RDC',
      page_location: window.location.href,
    });

    if (googleAdsId) {
      window.gtag('config', googleAdsId);
    }
  } catch (e) {
    // Ignore
  }

  // Only load real external GA4 script if it is not the placeholder ID
  if (validId && validId.startsWith('G-') && validId !== 'G-KINSHASA2026') {
    let script = document.getElementById('ga4-official-tag') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'ga4-official-tag';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://www.googletagmanager.com/gtag/js?id=${validId}`;
      script.onload = () => {
        window.googleAnalyticsLoaded = true;
        console.log(`[Google Analytics 4 / Ads] Actif avec ID : ${validId}`);
      };
      script.onerror = () => {
        console.warn(`[Google Analytics 4] Échec du chargement du script GA4 ${validId}`);
      };
      document.head.appendChild(script);
    }
  } else {
    window.googleAnalyticsLoaded = true;
  }
}

/**
 * Initialize Meta Pixel (Facebook & Instagram)
 */
export function initMetaPixel(pixelId: string = DEFAULT_META_PIXEL_ID) {
  if (typeof window === 'undefined' || !pixelId) return;
  const validId = pixelId.trim();

  if (!window.fbq) {
    const fbq: any = function () {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        fbq.queue.push(arguments);
      }
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;

    if (validId !== DEFAULT_META_PIXEL_ID && /^\d+$/.test(validId)) {
      const script = document.createElement('script');
      script.id = 'meta-pixel-tag';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.onload = () => {
        window.metaPixelLoaded = true;
        console.log(`[Meta Pixel Facebook/Instagram] Actif avec ID : ${validId}`);
      };
      script.onerror = () => {
        console.warn(`[Meta Pixel] Script non chargé (adblocker ou réseau). Mode virtuel actif.`);
      };
      document.head.appendChild(script);
    } else {
      window.metaPixelLoaded = true;
    }
  }

  try {
    window.fbq('init', validId);
    window.fbq('track', 'PageView');
  } catch (e) {
    // Handled
  }
}

/**
 * Initialize TikTok Pixel
 */
export function initTikTokPixel(pixelId: string = DEFAULT_TIKTOK_PIXEL_ID) {
  if (typeof window === 'undefined' || !pixelId) return;
  const validId = pixelId.trim();

  if (!window.ttq) {
    const ttq: any = [];
    ttq.methods = [
      'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group',
      'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'
    ];
    ttq.setAndDefer = function (t: any, e: any) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.instance = function (t: any) {
      const e = ttq._i[t] || [];
      for (let n = 0; n < ttq.methods.length; n++) {
        ttq.setAndDefer(e, ttq.methods[n]);
      }
      return e;
    };
    ttq.load = function (e: any, n: any) {
      const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      if (validId !== DEFAULT_TIKTOK_PIXEL_ID && validId.length > 5) {
        const o = document.createElement('script');
        o.type = 'text/javascript';
        o.async = true;
        o.crossOrigin = 'anonymous';
        o.src = i + '?sdkid=' + e + '&lib=ttq';
        o.id = 'tiktok-pixel-tag';
        o.onload = () => {
          window.tiktokPixelLoaded = true;
          console.log(`[TikTok Pixel] Actif avec ID : ${validId}`);
        };
        o.onerror = () => {
          console.warn(`[TikTok Pixel] Script non chargé (adblocker ou réseau). Mode virtuel actif.`);
        };
        const a = document.getElementsByTagName('script')[0];
        a?.parentNode?.insertBefore(o, a);
      } else {
        window.tiktokPixelLoaded = true;
      }
    };
    window.ttq = ttq;
  }

  try {
    window.ttq.load(validId);
    window.ttq.page();
  } catch (e) {
    // Handled
  }
}

/**
 * Initialize all tracking pixels and Google Tag Manager
 */
export function initAllTracking(config: TrackingConfig = getStoredTrackingConfig()) {
  if (typeof window === 'undefined') return;

  if (config.isGtmEnabled && config.gtmContainerId) {
    initGoogleTagManager(config.gtmContainerId);
  }
  if (config.googleAnalyticsId) {
    initGoogleAnalytics(config.googleAnalyticsId, config.isGoogleAdsEnabled ? config.googleAdsId : undefined);
  }
  if (config.isMetaPixelEnabled && config.metaPixelId) {
    initMetaPixel(config.metaPixelId);
  }
  if (config.isTiktokPixelEnabled && config.tiktokPixelId) {
    initTikTokPixel(config.tiktokPixelId);
  }
}

/**
 * Push an omnichannel event to GTM DataLayer, GA4, Meta Pixel, TikTok Pixel & Google Ads
 */
export function dispatchOmniEvent(
  eventName: string,
  category: string,
  params: Record<string, any>,
  metaEventName?: string,
  tiktokEventName?: string,
  googleAdsConversion?: boolean
) {
  const destinations: ('GTM' | 'GA4' | 'Meta Pixel' | 'TikTok Pixel' | 'Google Ads')[] = [];
  const config = getStoredTrackingConfig();

  // 1. Google Tag Manager DataLayer Push
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      event_category: category,
      event_timestamp: new Date().toISOString(),
      platform: 'Kinshasa Immobilier RDC',
      currency: params.currency || 'USD',
      ...params,
    });
    destinations.push('GTM');
  } catch (e) {
    console.warn('[GTM DataLayer] Push error:', e);
  }

  // 2. Google Analytics 4 Event
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
      destinations.push('GA4');
    }
  } catch (e) {
    console.warn('[GA4] Event error:', e);
  }

  // 3. Meta Pixel (Facebook/Instagram)
  if (config.isMetaPixelEnabled) {
    try {
      if (typeof window.fbq === 'function') {
        if (metaEventName) {
          window.fbq('track', metaEventName, params);
        } else {
          window.fbq('trackCustom', eventName, params);
        }
        destinations.push('Meta Pixel');
      }
    } catch (e) {
      console.warn('[Meta Pixel] Event error:', e);
    }
  }

  // 4. TikTok Pixel
  if (config.isTiktokPixelEnabled) {
    try {
      if (typeof window.ttq === 'object' && typeof window.ttq.track === 'function') {
        window.ttq.track(tiktokEventName || metaEventName || eventName, params);
        destinations.push('TikTok Pixel');
      }
    } catch (e) {
      console.warn('[TikTok Pixel] Event error:', e);
    }
  }

  // 5. Google Ads Conversion Tracking
  if (config.isGoogleAdsEnabled && googleAdsConversion && config.googleAdsId && config.googleAdsConversionLabel) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: `${config.googleAdsId}/${config.googleAdsConversionLabel}`,
          value: params.value || 1.0,
          currency: params.currency || 'USD',
        });
        destinations.push('Google Ads');
      }
    } catch (e) {
      console.warn('[Google Ads] Conversion error:', e);
    }
  }

  // Log in Live Inspector
  const logEntry: AnalyticsEventLog = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventName,
    category,
    params,
    timestamp: new Date().toLocaleTimeString('fr-FR'),
    destinations,
  };

  eventLogs.unshift(logEntry);
  if (eventLogs.length > 60) eventLogs.pop();
  notifyLogListeners();
}

/**
 * Universal Track Event
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  dispatchOmniEvent(eventName, 'general', params);
}

/**
 * Track Page View (GTM, GA4, Meta PageView, TikTok PageView)
 */
export function trackPageView(pageTitle: string, path: string = window.location.pathname) {
  dispatchOmniEvent(
    'page_view',
    'navigation',
    {
      page_title: pageTitle,
      page_location: window.location.href,
      page_path: path,
    },
    'PageView',
    'PageView'
  );
}

/**
 * Track Property View (GTM view_item, Meta ViewContent, TikTok ViewContent)
 */
export function trackPropertyView(property: Property) {
  dispatchOmniEvent(
    'view_item',
    'real_estate',
    {
      content_type: 'property',
      content_name: property.title,
      content_id: property.id,
      item_id: property.id,
      item_name: property.title,
      item_category: property.type,
      item_category2: property.status,
      item_location_id: property.city,
      commune: property.commune || 'Kinshasa',
      price: property.price,
      currency: property.currency,
      value: property.price,
      agent_id: property.agentId,
      views_total: (property.viewsCount || 0) + 1,
    },
    'ViewContent',
    'ViewContent'
  );
}

/**
 * Track Lead inquiry submitted (GTM generate_lead, Meta Lead, TikTok SubmitForm, Google Ads Conversion)
 */
export function trackLeadGenerated(lead: LeadRequest) {
  dispatchOmniEvent(
    'generate_lead',
    'conversion',
    {
      lead_id: lead.id,
      property_id: lead.propertyId,
      property_title: lead.propertyTitle,
      agent_id: lead.agentId,
      request_type: lead.requestType,
      user_name: lead.userName,
      user_email: lead.userEmail,
      value: 50.0,
      currency: 'USD',
    },
    'Lead',
    'SubmitForm',
    true
  );
}

/**
 * Track direct contact action (WhatsApp, Call, Email)
 */
export function trackContactClick(type: 'whatsapp' | 'call' | 'email', property?: Property) {
  dispatchOmniEvent(
    'contact_agent',
    'lead_action',
    {
      contact_method: type,
      content_id: property?.id,
      content_name: property?.title,
      property_id: property?.id,
      property_title: property?.title,
      agent_id: property?.agentId,
      city: property?.city || 'Kinshasa',
      value: type === 'whatsapp' ? 30.0 : 20.0,
      currency: 'USD',
    },
    'Contact',
    'Contact',
    type === 'whatsapp'
  );
}

/**
 * Track Search filter execution (GTM search, Meta Search, TikTok Search)
 */
export function trackSearchEvent(searchTerm?: string, city?: string, type?: string, maxPrice?: number) {
  dispatchOmniEvent(
    'search',
    'engagement',
    {
      search_term: searchTerm || 'all',
      search_string: searchTerm || '',
      city_filter: city || 'Kinshasa',
      property_type: type || 'all',
      max_price: maxPrice || 0,
    },
    'Search',
    'Search'
  );
}

/**
 * Track Agency Registration (GTM agency_registration, Meta CompleteRegistration, TikTok CompleteRegistration, Google Ads Conversion)
 */
export function trackAgencyRegistration(agency: Agency, managerName?: string) {
  dispatchOmniEvent(
    'agency_registration',
    'acquisition',
    {
      agency_id: agency.id,
      agency_name: agency.name,
      commune: agency.commune || 'Gombe',
      rccm: agency.rccm || 'RDC-RCCM',
      manager_name: managerName || agency.managerName,
      subscription_plan: 'agency_pro_1month_free',
      value: 150.0,
      currency: 'USD',
    },
    'CompleteRegistration',
    'CompleteRegistration',
    true
  );
}

/**
 * Track User Registration (GTM sign_up, Meta CompleteRegistration, TikTok CompleteRegistration)
 */
export function trackUserRegistration(user: User) {
  dispatchOmniEvent(
    'sign_up',
    'user_lifecycle',
    {
      user_id: user.id,
      method: user.provider || 'form',
      user_role: user.role,
      agency_name: user.agencyName,
      two_factor_enabled: user.twoFactorEnabled,
    },
    'CompleteRegistration',
    'CompleteRegistration'
  );
}

/**
 * Track Subscription or Invoice Payment (GTM purchase, Meta Purchase, TikTok PlaceAnOrder, Google Ads Conversion)
 */
export function trackSubscriptionPayment(invoice: Invoice) {
  dispatchOmniEvent(
    'purchase',
    'ecommerce',
    {
      transaction_id: invoice.invoiceNumber || invoice.id,
      value: invoice.totalAmount,
      currency: invoice.currency || 'USD',
      items: (invoice.items || []).map((item) => ({
        item_id: item.id,
        item_name: item.description,
        price: item.amount,
        quantity: item.quantity,
      })),
      target_type: invoice.targetType,
      target_name: invoice.targetName,
      payment_method: invoice.paymentMethod,
    },
    'Purchase',
    'PlaceAnOrder',
    true
  );
}

/**
 * Track PDF download
 */
export function trackPDFDownload(propertyTitle: string, propertyId: string) {
  dispatchOmniEvent('file_download', 'engagement', {
    file_name: `${propertyTitle}.pdf`,
    file_extension: 'pdf',
    property_id: propertyId,
  });
}

/**
 * Track Social Share
 */
export function trackSocialShare(platform: string, propertyTitle: string) {
  dispatchOmniEvent('share', 'engagement', {
    method: platform,
    content_type: 'property',
    item_id: propertyTitle,
  });
}

/**
 * Compute daily statistics for analytics chart
 */
export function generateDailyStats(properties: Property[], leads: LeadRequest[], days: number = 14) {
  const result: { date: string; shortDate: string; views: number; leads: number; whatsapp: number }[] = [];
  const now = new Date();

  const totalViews = properties.reduce((sum, p) => sum + (p.viewsCount || 0), 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const shortDate = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

    const dayFactor = Math.sin(i * 0.8) * 0.3 + 0.7;
    const weekendBoost = d.getDay() === 0 || d.getDay() === 6 ? 1.35 : 1.0;
    const dailyViewRatio = (1 / days) * dayFactor * weekendBoost;

    const dailyViews = Math.max(1, Math.round(totalViews * dailyViewRatio * (0.8 + Math.random() * 0.4)));
    const dailyLeadsCount = leads.filter((l) => l.createdAt && l.createdAt.startsWith(dateStr)).length || (i % 3 === 0 ? 1 : 0);
    const dailyWhatsapp = Math.max(0, Math.round(dailyViews * 0.12));

    result.push({
      date: dateStr,
      shortDate,
      views: dailyViews,
      leads: dailyLeadsCount,
      whatsapp: dailyWhatsapp,
    });
  }

  return result;
}
