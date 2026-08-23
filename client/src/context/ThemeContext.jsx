import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../services/api';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, user }) {
  const getInitialTheme = () => {
    if (user && user.preferredTheme && ['dark', 'light'].includes(user.preferredTheme)) {
      return user.preferredTheme;
    }
    const saved = localStorage.getItem('app_theme');
    if (saved && ['dark', 'light'].includes(saved)) {
      return saved;
    }
    // Default Technician role to Light theme (outdoor service bay legibility)
    if (user && user.role === 'TECHNICIAN') {
      return 'light';
    }
    return 'dark';
  };

  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply theme data attribute to <html> element whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Sync user's saved preference when logged-in user loads or changes
  useEffect(() => {
    if (user && user.preferredTheme && ['dark', 'light'].includes(user.preferredTheme)) {
      setThemeState(user.preferredTheme);
    } else if (user && user.role === 'TECHNICIAN' && !localStorage.getItem('app_theme')) {
      setThemeState('light');
    }
  }, [user]);

  const changeTheme = async (newTheme) => {
    if (!['dark', 'light'].includes(newTheme)) return;

    setThemeState(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app_theme', newTheme);

    // Sync to PostgreSQL user DB record if logged in
    if (user && user.id) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/auth/theme`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify({ preferredTheme: newTheme })
        });
      } catch (err) {
        console.error('Failed to persist theme preference:', err);
      }
    }
  };

  const toggleTheme = () => {
    changeTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: changeTheme,
      toggleTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light'
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Safe fallback if called outside provider
    return {
      theme: 'dark',
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: true,
      isLight: false
    };
  }
  return context;
}
