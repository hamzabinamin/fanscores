import React, { createContext, useContext, useMemo, useState } from 'react';

type ThemeType = 'dark' | 'light';

export const ThemeTokens = {
  dark: {
    background: '#121212',
    card: '#1c1c1e',
    innerCard: '#1a1a1a',
    text: '#ffffff',
    textMuted: '#8e8e93',
    border: '#2c2c2e',
    inputBg: '#1e1e1e',
  },
  light: {
    background: '#f2f2f7',
    card: '#ffffff',
    innerCard: '#f4f4f4',
    text: '#000000',
    textMuted: '#666666',
    border: '#e5e5ea',
    inputBg: '#ffffff',
  }
};

interface ThemeContextProps {
  theme: ThemeType;
  colors: typeof ThemeTokens.dark;
  toggleTheme: () => void;
}

// 🌟 Export the context directly so Expo Router modules can evaluate its type signature globally
export const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>('dark');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 🌟 Memoizing colors breaks the stale object-reference cache, forcing children to update
  const colors = useMemo(() => {
    return ThemeTokens[theme];
  }, [theme]);

  // 🌟 Memoize the context value payload itself to prevent wasteful middle-layer renders
  const contextValue = useMemo(() => ({
    theme,
    colors,
    toggleTheme
  }), [theme, colors]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within an explicit <ThemeProvider> parent wrapper.');
  }
  return context;
}