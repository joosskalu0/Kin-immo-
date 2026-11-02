import React, { useEffect, useRef } from 'react';

interface GoogleAdSenseBannerProps {
  slotId?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  responsive?: boolean;
  className?: string;
}

export const ADSENSE_CLIENT_ID = 'ca-pub-2107140737970807';

export const GoogleAdSenseBanner: React.FC<GoogleAdSenseBannerProps> = ({
  slotId,
  format = 'auto',
  responsive = true,
  className = '',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const isPushed = useRef(false);

  useEffect(() => {
    // Only attempt push if slotId is provided and hasn't been pushed yet
    if (!isPushed.current && slotId) {
      try {
        if (typeof window !== 'undefined') {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
          isPushed.current = true;
        }
      } catch (err) {
        // Safe catch for ad-blockers or sandbox environments
        console.debug('AdSense push handled:', err);
      }
    }
  }, [slotId]);

  if (!slotId) {
    // When no slotId is provided, AdSense Auto Ads (configured via the head script)
    // will automatically place ads across optimal positions on the page.
    return null;
  }

  return (
    <div className={`adsense-container overflow-hidden text-center my-4 ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};
