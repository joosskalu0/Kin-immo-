import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Video as VideoIcon,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { detectVideoType, getYouTubeEmbedUrl, getVimeoEmbedUrl } from '../utils/videoHelpers';

interface PropertyVideoPlayerProps {
  videoUrl: string;
  title?: string;
  posterImage?: string;
  autoPlay?: boolean;
  className?: string;
}

export const PropertyVideoPlayer: React.FC<PropertyVideoPlayerProps> = ({
  videoUrl,
  title = 'Visite Vidéo de la Propriété',
  posterImage,
  autoPlay = false,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!videoUrl) {
    return (
      <div className={`aspect-video rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400 ${className}`}>
        <VideoIcon className="w-12 h-12 text-slate-600 mb-2" />
        <p className="font-semibold text-slate-300">Aucune vidéo disponible pour ce bien</p>
        <p className="text-xs text-slate-500 mt-1">L'agent n'a pas encore ajouté de visite vidéo.</p>
      </div>
    );
  }

  const videoType = detectVideoType(videoUrl);

  // Toggle play/pause for native HTML5 video
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Request fullscreen
  const toggleFullScreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  // If YouTube
  if (videoType === 'youtube') {
    const embedUrl = getYouTubeEmbedUrl(videoUrl, autoPlay);
    if (!embedUrl) {
      return (
        <div className={`aspect-video rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center ${className}`}>
          <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
          <p className="font-semibold text-slate-200 text-sm">Lien YouTube invalide</p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition-all"
          >
            <ExternalLink className="w-4 h-4" /> Ouvrir la vidéo
          </a>
        </div>
      );
    }

    return (
      <div className={`relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  // If Vimeo
  if (videoType === 'vimeo') {
    const embedUrl = getVimeoEmbedUrl(videoUrl, autoPlay);
    if (embedUrl) {
      return (
        <div className={`relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl ${className}`}>
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
  }

  // If Direct Video (MP4, WebM, data URL, blob, etc.)
  return (
    <div className={`relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl group ${className}`}>
      {hasError ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-300">
          <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
          <p className="font-bold text-sm">Impossible de lire le fichier vidéo</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Le format vidéo n'est pas pris en charge ou le lien a expiré.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setHasError(false);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Réessayer
            </button>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ouvrir directement
            </a>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterImage}
            playsInline
            controls
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover bg-black cursor-pointer"
          />

          {/* Quick Play Overlay if not playing */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-opacity group-hover:bg-slate-950/30"
            >
              <button
                type="button"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 transition-all transform group-hover:scale-110 active:scale-95 pl-1"
              >
                <Play className="w-8 h-8 fill-slate-950 text-slate-950" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold border border-white/10 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Lancer la Visite Vidéo HD
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
