// src/hooks/useSoul.js
import { useState, useEffect } from 'react';
import { getDemoSoul } from '../lib/api';

const STORAGE_KEY = 'chog_soul_data';

export function useSoul() {
  const [soul, setSoul] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Load Soul on startup (from localStorage OR backend)
  useEffect(() => {
    async function loadSoul() {
      const savedSoul = localStorage.getItem(STORAGE_KEY);
      
      if (savedSoul) {
        setSoul(JSON.parse(savedSoul));
        setLoading(false);
      } else {
        try {
          const demo = await getDemoSoul();
          setSoul(demo);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
        } catch (err) {
          console.error("Failed to load demo soul", err);
        } finally {
          setLoading(false);
        }
      }
    }
    loadSoul();
  }, []);

  // 2. Update Soul (called after Chat, Quest, or Battle)
  const updateSoul = (newSoulData) => {
    setSoul(newSoulData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSoulData));
  };

  // 3. Reset Soul (useful for testing)
  const resetSoul = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return { soul, updateSoul, resetSoul, loading };
}