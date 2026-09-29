import { useState, useEffect } from 'react';

/** Per-device display preferences (theme, POS layout, text / button / zoom scale, sidebar) and POS grid paging. */
export function useUiPreferences() {

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pos_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Custom states built for the high-end dark POS terminal style from screenshotted design:
  const [posLayoutMode, setPosLayoutMode] = useState<'modern' | 'terminal'>(() => {
    const saved = localStorage.getItem('pos_layout_mode');
    return saved === 'modern' ? 'modern' : 'terminal';
  });

  // Global Text & Button Size Controllers:
  const [globalFontScale, setGlobalFontScale] = useState<number>(() => {
    const saved = localStorage.getItem('pos_global_font_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [globalButtonScale, setGlobalButtonScale] = useState<number>(() => {
    const saved = localStorage.getItem('pos_global_button_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [globalZoomScale, setGlobalZoomScale] = useState<number>(() => {
    const saved = localStorage.getItem('pos_global_zoom_scale');
    return saved ? parseFloat(saved) : 0.85; // Default to 85% to perfectly fit standard POS resolutions (1024x768 / 1366x768)
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('pos_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pos_global_font_scale', String(globalFontScale));
  }, [globalFontScale]);

  useEffect(() => {
    localStorage.setItem('pos_global_button_scale', String(globalButtonScale));
  }, [globalButtonScale]);

  useEffect(() => {
    localStorage.setItem('pos_global_zoom_scale', String(globalZoomScale));
  }, [globalZoomScale]);

  useEffect(() => {
    localStorage.setItem('pos_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const [terminalProductPage, setTerminalProductPage] = useState<number>(0);

  const [terminalItemsPerPage, setTerminalItemsPerPage] = useState<number>(() => {
    return parseInt(localStorage.getItem('terminal_items_per_page') || '12');
  });

  useEffect(() => {
    localStorage.setItem('terminal_items_per_page', String(terminalItemsPerPage));
  }, [terminalItemsPerPage]);

  // Handle theme transitions on root document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('pos_theme', theme);
  }, [theme]);

  // Handle saving posLayoutMode state
  useEffect(() => {
    localStorage.setItem('pos_layout_mode', posLayoutMode);
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
