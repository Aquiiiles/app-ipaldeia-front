import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Settings = {
  darkMode: boolean;
  fontSize: number;
};

type SettingsContextType = Settings & {
  setDarkMode: (v: boolean) => void;
  setFontSize: (v: number) => void;
};

const defaults: Settings = { darkMode: false, fontSize: 16 };

const SettingsContext = createContext<SettingsContextType>({
  ...defaults,
  setDarkMode: () => {},
  setFontSize: () => {},
});

const STORAGE_KEY = '@ipaldeia_settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try { setSettings({ ...defaults, ...JSON.parse(raw) }); } catch {}
        }
      })
      // Never leave the app stuck on a blank screen if the storage read fails —
      // mark as loaded regardless so the UI renders with default settings.
      .finally(() => setLoaded(true));
  }, []);

  function persist(next: Settings) {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }

  if (!loaded) return null;

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setDarkMode: (v) => persist({ ...settings, darkMode: v }),
        setFontSize: (v) => persist({ ...settings, fontSize: v }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useThemeColors() {
  const { darkMode } = useSettings();
  if (darkMode) {
    return {
      background: '#1a1a1a',
      card: '#2a2a2a',
      surface: '#333333',
      text: '#e8e4dd',
      textSecondary: '#a0a090',
      border: '#444444',
      headerBg: '#1e2a1f',
      primaryDark: '#5a7a5e',
      inputBg: '#2a2a2a',
    };
  }
  return {
    background: '#E8E4DD',
    card: 'rgba(255,255,255,0.7)',
    surface: '#F5F0EB',
    text: '#2C2C2C',
    textSecondary: '#6B6B6B',
    border: '#D4CFC8',
    headerBg: '#3C4A3E',
    primaryDark: '#3C4A3E',
    inputBg: '#FFFFFF',
  };
}
