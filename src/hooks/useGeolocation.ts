"use client";

import { useState, useCallback } from "react";

interface GeoState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const getPosition = useCallback((): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        setState((s) => ({ ...s, error: "Geolocation not supported" }));
        resolve(null);
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setState({ ...coords, error: null, loading: false });
          resolve(coords);
        },
        (err) => {
          const message =
            err.code === 1
              ? "Location access denied. Check-in will proceed without location verification."
              : err.code === 2
                ? "Location unavailable. Check-in will proceed without location verification."
                : "Location request timed out. Check-in will proceed without location verification.";
          setState((s) => ({ ...s, error: message, loading: false }));
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  return { ...state, getPosition };
}
