import { useState, useEffect } from 'react';
import * as storage from '../lib/storage';

/** Per-device display preferences (theme, POS layout, text / button / zoom scale, sidebar) and POS grid paging. */
export function useUiPreferences() {

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = storage.getItem('pos_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Custom states built for the high-end dark POS terminal style from screenshotted design:
  const [posLayoutMode, setPosLayoutMode] = useState<'modern' | 'terminal'>(() => {
    const saved = storage.getItem('pos_layout_mode');
    return saved === 'modern' ? 'modern' : 'terminal';
  });

  // Global Text & Button Size Controllers:
  const [globalFontScale, setGlobalFontScale] = useState<number>(() => {
    const saved = storage.getItem('pos_global_font_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [globalButtonScale, setGlobalButtonScale] = useState<number>(() => {
    const saved = storage.getItem('pos_global_button_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [globalZoomScale, setGlobalZoomScale] = useState<number>(() => {
    const saved = storage.getItem('pos_global_zoom_scale');
    return saved ? parseFloat(saved) : 0.85; // Default to 85% to perfectly fit standard POS resolutions (1024x768 / 1366x768)
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return storage.getItem('pos_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    storage.setItem('pos_global_font_scale', String(globalFontScale));
  }, [globalFontScale]);

  useEffect(() => {
    storage.setItem('pos_global_button_scale', String(globalButtonScale));
  }, [globalButtonScale]);

  useEffect(() => {
    storage.setItem('pos_global_zoom_scale', String(globalZoomScale));
  }, [globalZoomScale]);

  useEffect(() => {
    storage.setItem('pos_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const [terminalProductPage, setTerminalProductPage] = useState<number>(0);

  const [terminalItemsPerPage, setTerminalItemsPerPage] = useState<number>(() => {
    return parseInt(storage.getItem('terminal_items_per_page') || '12');
  });

  useEffect(() => {
    storage.setItem('terminal_items_per_page', String(terminalItemsPerPage));
  }, [terminalItemsPerPage]);

  // Handle theme transitions on root document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    storage.setItem('pos_theme', theme);
  }, [theme]);

  // Handle saving posLayoutMode state
  useEffect(() => {
    storage.setItem('pos_layout_mode', posLayoutMode);
  }, [posLayoutMode]);

  return {
    theme,
    setTheme,
    posLayoutMode,
    setPosLayoutMode,
    globalFontScale,
    setGlobalFontScale,
    globalButtonScale,
    setGlobalButtonScale,
    globalZoomScale,
    setGlobalZoomScale,
    sidebarCollapsed,
    setSidebarCollapsed,
    terminalProductPage,
    setTerminalProductPage,
    terminalItemsPerPage,
    setTerminalItemsPerPage,
  };
}
