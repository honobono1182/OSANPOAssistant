import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type { GeoPosition } from '../hooks/useGeolocation';

// --- Map Tile URLs ---
const LIGHT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

// --- Sub-component to handle map center updates ---
function MapCenterUpdater({
  position,
  shouldFollow,
}: {
  position: GeoPosition | null;
  shouldFollow: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (position && shouldFollow) {
      map.setView([position.latitude, position.longitude], map.getZoom(), {
        animate: true,
      });
    }
  }, [position, shouldFollow, map]);

  return null;
}

// --- Sub-component to handle tile layer switching ---
function TileLayerSwitcher({ theme }: { theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  return (
    <TileLayer
      key={theme}
      attribution={isDark ? DARK_TILE_ATTRIBUTION : TILE_ATTRIBUTION}
      url={isDark ? DARK_TILE_URL : LIGHT_TILE_URL}
    />
  );
}

interface OSMMapProps {
  position: GeoPosition | null;
  theme: 'light' | 'dark';
  routeCoords: [number, number][] | null;
  passedSegmentIndex: number;
  followUser: boolean;
  onMapReady?: (map: LeafletMap) => void;
}

export function OSMMap({
  position,
  theme,
  routeCoords,
  passedSegmentIndex,
  followUser,
}: OSMMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  const defaultCenter: [number, number] = position
    ? [position.latitude, position.longitude]
    : [35.6812, 139.7671]; // 東京駅 fallback

  // Split route into passed/remaining parts
  const { passedCoords, remainingCoords } = useMemo(() => {
    if (!routeCoords || routeCoords.length === 0) {
      return { passedCoords: [], remainingCoords: [] };
    }
    const passed = routeCoords.slice(0, passedSegmentIndex + 1);
    const remaining = routeCoords.slice(passedSegmentIndex);
    return { passedCoords: passed, remainingCoords: remaining };
  }, [routeCoords, passedSegmentIndex]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={15}
      zoomControl={true}
      style={{ width: '100%', height: '100%' }}
      ref={mapRef}
    >
      <TileLayerSwitcher theme={theme} />
      <MapCenterUpdater position={position} shouldFollow={followUser} />

      {/* 通過済みルート (灰色) */}
      {passedCoords.length > 1 && (
        <Polyline
          positions={passedCoords}
          pathOptions={{
            color: '#94a3b8',
            weight: 6,
            opacity: 0.5,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* 未到達ルート (青) */}
      {remainingCoords.length > 1 && (
        <Polyline
          positions={remainingCoords}
          pathOptions={{
            color: '#3b82f6',
            weight: 6,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* 現在地マーカー */}
      {position && (
        <>
          {/* 精度の範囲を示す円 */}
          <CircleMarker
            center={[position.latitude, position.longitude]}
            radius={20}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 1,
              opacity: 0.3,
            }}
          />
          {/* 中心の点 */}
          <CircleMarker
            center={[position.latitude, position.longitude]}
            radius={7}
            pathOptions={{
              color: 'white',
              fillColor: '#3b82f6',
              fillOpacity: 1,
              weight: 3,
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
