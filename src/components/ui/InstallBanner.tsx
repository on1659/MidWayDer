'use client';

import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * PWA 설치 배너 컴포넌트
 * - beforeinstallprompt 이벤트 감지
 * - 사용자에게 설치 유도
 * - 설치/나중에 선택 가능
 */
export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 이미 설치했거나 거부한 경우 표시하지 않음
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedAt = Number(dismissed);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < thirtyDays) return;
      localStorage.removeItem('pwa-install-dismissed');
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      const timer = setTimeout(() => setShowIosGuide(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 사용자 인터랙션 후 배너 표시 (즉시 표시하지 않음)
      setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 앱이 이미 설치된 경우
    const installedHandler = () => {
      console.log('[PWA] App installed successfully');
      setDeferredPrompt(null);
      setShowBanner(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install');
      } else {
        console.log('[PWA] User dismissed install');
      }

      setDeferredPrompt(null);
      setShowBanner(false);
    } catch (error) {
      console.error('[PWA] Install error:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIosGuide(false);
    // 거부 상태 저장 (30일간 표시하지 않음)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner && !showIosGuide) return null;

  return (
    <div 
      className="fixed left-4 right-4 md:left-auto md:right-4 md:w-96 rounded-xl shadow-2xl p-4 z-50 animate-slide-up"
      style={{ 
        bottom: 'calc(5rem + env(safe-area-inset-bottom))',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)'
      }}
      role="dialog"
      aria-labelledby="install-title"
      aria-describedby="install-desc"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {showIosGuide ? (
            <Share className="w-6 h-6 text-blue-500" aria-hidden="true" />
          ) : (
            <Download className="w-6 h-6 text-blue-500" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 
            id="install-title"
            className="font-semibold text-base"
            style={{ color: 'var(--text-primary)' }}
          >
            {showIosGuide ? '홈 화면에 추가하기' : '앱으로 설치하기'}
          </h3>
          <p 
            id="install-desc"
            className="text-sm mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {showIosGuide ? '공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택하세요' : '홈 화면에 추가하여 앱처럼 사용하세요'}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}
          aria-label="닫기"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        {!showIosGuide && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            설치
          </button>
        )}
        <button
          onClick={handleDismiss}
          className={`${showIosGuide ? 'flex-1' : 'px-4'} py-2.5 rounded-lg font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2`}
          style={{ 
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface-muted)'
          }}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
