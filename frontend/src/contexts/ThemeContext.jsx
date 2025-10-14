import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    name: 'فاتح',
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  },
  dark: {
    name: 'داكن',
    primary: '#60a5fa',
    secondary: '#94a3b8',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa'
  },
  blue: {
    name: 'أزرق',
    primary: '#2563eb',
    secondary: '#60a5fa',
    background: '#eff6ff',
    surface: '#dbeafe',
    text: '#1e3a8a',
    textSecondary: '#3b82f6',
    border: '#93c5fd',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  },
  green: {
    name: 'أخضر',
    primary: '#059669',
    secondary: '#10b981',
    background: '#ecfdf5',
    surface: '#d1fae5',
    text: '#064e3b',
    textSecondary: '#059669',
    border: '#6ee7b7',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium'); // small, medium, large
  const [layoutMode, setLayoutMode] = useState('comfortable'); // compact, comfortable, spacious

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    const savedLayoutMode = localStorage.getItem('layoutMode') || 'comfortable';
    
    setCurrentTheme(savedTheme);
    setFontSize(savedFontSize);
    setLayoutMode(savedLayoutMode);
    applyTheme(savedTheme);
    applyFontSize(savedFontSize);
  }, []);

  const applyTheme = (themeName) => {
    const theme = themes[themeName];
    const root = document.documentElement;
    
    Object.entries(theme).forEach(([key, value]) => {
      if (key !== 'name') {
        root.style.setProperty(`--color-${key}`, value);
      }
    });

    if (themeName === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  const applyFontSize = (size) => {
    const root = document.documentElement;
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.setProperty('--base-font-size', sizes[size]);
  };

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('theme', themeName);
    applyTheme(themeName);
  };

  const changeFontSize = (size) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
    applyFontSize(size);
  };

  const changeLayoutMode = (mode) => {
    setLayoutMode(mode);
    localStorage.setItem('layoutMode', mode);
  };

  return (
    <ThemeContext.Provider value={{
      theme: themes[currentTheme],
      themeName: currentTheme,
      fontSize,
      layoutMode,
      changeTheme,
      changeFontSize,
      changeLayoutMode,
      availableThemes: Object.keys(themes)
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};