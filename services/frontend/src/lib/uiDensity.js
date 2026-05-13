import { useEffect, useState } from 'react';

const DENSITY_KEY = 'ui_density';
const DENSITY_EVENT = 'ui-density-change';

export function getDensity() {
  const value = localStorage.getItem(DENSITY_KEY);
  return value === 'compact' ? 'compact' : 'comfortable';
}

export function setDensity(nextDensity) {
  const safeDensity = nextDensity === 'compact' ? 'compact' : 'comfortable';
  localStorage.setItem(DENSITY_KEY, safeDensity);
  window.dispatchEvent(new Event(DENSITY_EVENT));
}

export function useDensity() {
  const [density, setDensityState] = useState(getDensity());

  useEffect(() => {
    function syncDensity() {
      setDensityState(getDensity());
    }

    window.addEventListener('storage', syncDensity);
    window.addEventListener(DENSITY_EVENT, syncDensity);
    return () => {
      window.removeEventListener('storage', syncDensity);
      window.removeEventListener(DENSITY_EVENT, syncDensity);
    };
  }, []);

  return {
    density,
    compact: density === 'compact',
    setDensity,
    toggleDensity: () => setDensity(density === 'compact' ? 'comfortable' : 'compact'),
  };
}
