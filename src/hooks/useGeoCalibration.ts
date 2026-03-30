import { useState, useEffect, useRef } from "react";

const ACCURACY_THRESHOLD = 500; // meters
const HINT_TIMEOUT_MS = 15000;  // 15 seconds

export interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  isCalibrating: boolean;
  isReady: boolean;        // true once accuracy < 500m
  hint: string | null;     // shown after 15s if still poor
}

export function useGeoCalibration(active: boolean): GeoState {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    accuracy: null,
    isCalibrating: false,
    isReady: false,
    hint: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestAccuracyRef = useRef<number>(Infinity);

  useEffect(() => {
    if (!active) {
      // Cleanup when not active (e.g. user switched role)
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
      setState({
        lat: null, lng: null, accuracy: null,
        isCalibrating: false, isReady: false, hint: null
      });
      return;
    }

    if (!navigator.geolocation) {
      setState(s => ({ ...s, hint: "Geolocation is not supported by this browser." }));
      return;
    }

    setState(s => ({ ...s, isCalibrating: true, hint: null, isReady: false }));
    bestAccuracyRef.current = Infinity;

    // Start 15s hint timer
    hintTimerRef.current = setTimeout(() => {
      setState(s => {
        if (!s.isReady) {
          return { ...s, hint: "Try moving away from tall trees or buildings to improve signal." };
        }
        return s;
      });
    }, HINT_TIMEOUT_MS);

    // Watch position — keeps updating as signal improves
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        // Only accept updates where accuracy is improving
        if (accuracy < bestAccuracyRef.current) {
          bestAccuracyRef.current = accuracy;

          const ready = accuracy < ACCURACY_THRESHOLD;
          setState(s => ({
            lat: latitude,
            lng: longitude,
            accuracy,
            isCalibrating: !ready,
            isReady: ready,
            // Clear hint if we become ready
            hint: ready ? null : s.hint,
          }));

          if (ready && hintTimerRef.current) {
            clearTimeout(hintTimerRef.current);
            hintTimerRef.current = null;
          }
        }
      },
      (err) => {
        setState(s => ({
          ...s,
          isCalibrating: false,
          hint: `Location error: ${err.message}`,
        }));
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
    };
  }, [active]);

  return state;
}
