import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Keep the web app inside the visible mobile-browser viewport.
 * `100vh` is taller than the screen when the URL bar is showing, which clips the tab bar.
 */
export function useWebViewportLock() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlPosition: html.style.position,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyPosition: body.style.position,
      rootOverflow: root?.style.overflow ?? '',
      rootHeight: root?.style.height ?? '',
    };

    const apply = () => {
      const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
      const px = `${height}px`;
      html.style.overflow = 'hidden';
      html.style.height = px;
      body.style.overflow = 'hidden';
      body.style.height = px;
      body.style.position = 'relative';
      if (root) {
        root.style.overflow = 'hidden';
        root.style.height = px;
      }
    };

    apply();
    window.visualViewport?.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);

    return () => {
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      html.style.position = prev.htmlPosition;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.position = prev.bodyPosition;
      if (root) {
        root.style.overflow = prev.rootOverflow;
        root.style.height = prev.rootHeight;
      }
    };
  }, []);
}
