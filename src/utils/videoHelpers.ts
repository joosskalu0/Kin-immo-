/**
 * Video Helper Utilities for Real Estate Walkthroughs and Tours
 */

export type VideoType = 'youtube' | 'vimeo' | 'direct' | 'unknown';

export interface SampleVideoOption {
  id: string;
  title: string;
  url: string;
  type: VideoType;
  description: string;
  duration: string;
  thumbnail: string;
}

export const SAMPLE_REAL_ESTATE_VIDEOS: SampleVideoOption[] = [
  {
    id: 'sample_villa_kin',
    title: 'Visite Guidée Villa Moderne avec Piscine (Ngaliema)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-modern-luxury-house-patio-and-pool-walkthrough-40541-large.mp4',
    type: 'direct',
    description: 'Visite HD en immersion 4K de la villa, grand jardin et piscine.',
    duration: '1:45',
    thumbnail: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sample_penthouse_gombe',
    title: 'Visite Duplex Penthouse Vue Fleuve Congo (Gombe)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-modern-living-room-with-large-windows-41584-large.mp4',
    type: 'direct',
    description: 'Tour complet du salon panoramique, cuisine ouverte et terrasse.',
    duration: '2:10',
    thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sample_apartment_kin',
    title: 'Appartement Lumineux & Meublé Standing',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-bright-kitchen-in-modern-house-41585-large.mp4',
    type: 'direct',
    description: 'Présentation des chambres, suites parentales et cuisine équipée.',
    duration: '1:20',
    thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80',
  },
];

/**
 * Detects the type of video from its URL or data stream.
 */
export function detectVideoType(url?: string): VideoType {
  if (!url || typeof url !== 'string') return 'unknown';

  const clean = url.trim().toLowerCase();

  if (
    clean.startsWith('data:video/') ||
    clean.startsWith('blob:') ||
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v') ||
    clean.includes('assets.mixkit.co') ||
    clean.includes('storage.googleapis.com') ||
    clean.includes('firebasestorage.googleapis.com')
  ) {
    return 'direct';
  }

  if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
    return 'youtube';
  }

  if (clean.includes('vimeo.com')) {
    return 'vimeo';
  }

  // If it's an http/https URL and looks like a stream or direct link
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return 'direct';
  }

  return 'unknown';
}

/**
 * Extracts a YouTube embed URL from various YouTube link formats.
 */
export function getYouTubeEmbedUrl(url: string, autoPlay = false): string | null {
  if (!url) return null;

  try {
    const autoplayParam = autoPlay ? 'autoplay=1&mute=0&' : 'autoplay=0&';

    // Format: https://youtu.be/ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch && shortMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}?${autoplayParam}rel=0&modestbranding=1&enablejsapi=1`;
    }

    // Format: https://www.youtube.com/watch?v=ID or shorts/ID
    const regMatch = url.match(/(?:v=|v\/|embed\/|shorts\/|watch\?v=)([a-zA-Z0-9_-]{11})/);
    if (regMatch && regMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${regMatch[1]}?${autoplayParam}rel=0&modestbranding=1&enablejsapi=1`;
    }

    // Direct embed URL already
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
  } catch (err) {
    console.error('Error parsing YouTube URL:', err);
  }

  return null;
}

/**
 * Extracts a Vimeo embed URL from a Vimeo link.
 */
export function getVimeoEmbedUrl(url: string, autoPlay = false): string | null {
  if (!url) return null;

  try {
    const autoplayParam = autoPlay ? 'autoplay=1&' : 'autoplay=0&';
    const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|video\/|)(\d+)(?:|\/\?)/);
    if (match && match[2]) {
      return `https://player.vimeo.com/video/${match[2]}?${autoplayParam}title=0&byline=0&portrait=0`;
    }

    if (url.includes('player.vimeo.com/video/')) {
      return url;
    }
  } catch (err) {
    console.error('Error parsing Vimeo URL:', err);
  }

  return null;
}
