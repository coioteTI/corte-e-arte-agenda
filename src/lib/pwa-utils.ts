/**
 * PWA utilities for Corte & Arte app
 */

export interface PWAInstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

/**
 * Check if the app is running as a PWA (installed)
 */
export const isPWAInstalled = (): boolean => {
  // Check if running in standalone mode (installed PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check iOS Safari standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  return isStandalone || isIOSStandalone;
};

/**
 * Check if PWA installation is available
 */
export const isPWAInstallable = (): boolean => {
  // Check if beforeinstallprompt is supported
  return 'BeforeInstallPromptEvent' in window || 'beforeinstallprompt' in window;
};

/**
 * Get device type for PWA optimization
 */
export const getDeviceType = (): 'desktop' | 'tablet' | 'mobile' => {
  const width = window.innerWidth;
  
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
};

/**
 * Check if device supports PWA features
 */
export const getPWACapabilities = () => {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    pushNotifications: 'PushManager' in window,
    backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
    fullscreen: 'requestFullscreen' in document.documentElement,
    orientation: 'orientation' in screen,
    vibration: 'vibrate' in navigator,
    geolocation: 'geolocation' in navigator,
    camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
  };
};

/**
 * Request persistent storage for PWA
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      return await navigator.storage.persist();
    } catch (error) {
      console.warn('Failed to request persistent storage:', error);
      return false;
    }
  }
  return false;
};

/**
 * Check online status
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Register for push notifications
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if ('Notification' in window) {
    return await Notification.requestPermission();
  }
  return 'denied';
};

/**
 * Show local notification
 */
export const showNotification = (title: string, options?: NotificationOptions) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const defaultOptions: NotificationOptions = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      ...options
    };
    
    return new Notification(title, defaultOptions);
  }
};

/**
 * Cache management utilities
 */
export const cacheUtils = {
  /**
   * Clear all caches
   */
  clearCache: async (): Promise<void> => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  },
  
  /**
   * Get cache size
   */
  getCacheSize: async (): Promise<number> => {
    if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }
};

/**
 * Update service worker
 */
export const updateServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
    }
  }
};