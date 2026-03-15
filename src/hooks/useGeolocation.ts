import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface UseGeolocationReturn {
  position: GeoPosition | null;
  error: string | null;
  isLoading: boolean;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  requestPosition: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
    setError(null);
    setIsLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let message: string;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = '位置情報のアクセスが拒否されました。ブラウザの設定で位置情報を許可してください。';
        break;
      case err.POSITION_UNAVAILABLE:
        message = '位置情報を取得できませんでした。';
        break;
      case err.TIMEOUT:
        message = '位置情報の取得がタイムアウトしました。';
        break;
      default:
        message = '位置情報の取得中にエラーが発生しました。';
    }
    setError(message);
    setIsLoading(false);
  }, []);

  const geoOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000,
  };

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('お使いのブラウザは位置情報をサポートしていません。');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSuccess, handleError]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('お使いのブラウザは位置情報をサポートしていません。');
      return;
    }
    if (watchIdRef.current !== null) return;

    const id = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);
    watchIdRef.current = id;
    setIsTracking(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSuccess, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
    }
  }, []);

  // 初回マウント時に現在地を取得
  useEffect(() => {
    requestPosition();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    position,
    error,
    isLoading,
    isTracking,
    startTracking,
    stopTracking,
    requestPosition,
  };
}
