"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [colorMode, setColorMode] = useState('colorful');
  const [chartStyle, setChartStyle] = useState('matrix');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('audit_theme');
    if (savedTheme) setTheme(savedTheme);
    
    const savedColorMode = localStorage.getItem('audit_colorMode');
    if (savedColorMode) setColorMode(savedColorMode);
    
    const savedChartStyle = localStorage.getItem('audit_chartStyle');
    if (savedChartStyle) setChartStyle(savedChartStyle);
    
    // Also apply initial data attributes immediately to prevent flash if possible
    const html = document.documentElement;
    html.setAttribute('data-theme', savedTheme || 'dark');
    html.setAttribute('data-colormode', savedColorMode || 'colorful');
    html.setAttribute('data-chartstyle', savedChartStyle || 'matrix');
    
    setIsLoaded(true);
  }, []);

  // Sync to local storage and DOM when state changes
  useEffect(() => {
    if (!isLoaded) return; // Prevent overwriting local storage on initial mount
    
    localStorage.setItem('audit_theme', theme);
    localStorage.setItem('audit_colorMode', colorMode);
    localStorage.setItem('audit_chartStyle', chartStyle);

    // Apply data attributes to <html> for global CSS targeting
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.setAttribute('data-colormode', colorMode);
    html.setAttribute('data-chartstyle', chartStyle);
  }, [theme, colorMode, chartStyle, isLoaded]);

  return (
    <SettingsContext.Provider value={{
      theme, setTheme,
      colorMode, setColorMode,
      chartStyle, setChartStyle
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
