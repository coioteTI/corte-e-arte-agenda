import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('corte-arte-theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Set data-theme attribute for additional CSS targeting
    root.setAttribute('data-theme', theme);
    
    // Save to localStorage
    localStorage.setItem('corte-arte-theme', theme);
    
    console.log('🎨 Theme applied:', theme, 'Classes:', root.classList.toString());
    console.log('📊 CSS Variables check:', {
      background: getComputedStyle(root).getPropertyValue('--background'),
      primary: getComputedStyle(root).getPropertyValue('--primary'),
      foreground: getComputedStyle(root).getPropertyValue('--foreground')
    });
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, setTheme, toggleTheme };
};