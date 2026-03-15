/**
 * ルーティングサービス
 * OSRM 公開デモAPIを利用して円状（ループ状）の散歩ルートを生成する。
 * 
 * ★ driving プロファイルを使用することで、国道・県道などの
 *   大きい道を優先的にルーティングし、山道や小道を回避する。
 *   所要時間は歩行速度（時速4km）で再計算する。
 */

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng][]
  distanceMeters: number;
  durationSeconds: number;
}

const OSRM_API_BASE = 'https://router.project-osrm.org';

// 歩幅定数（メートル）
const STEP_LENGTH_METERS = 0.7;
// 歩行速度（km/h）
const WALKING_SPEED_KMH = 4.0;

/**
 * 目標歩数からおおよその目標距離（メートル）を算出
 */
export function stepsToDistance(steps: number): number {
  return steps * STEP_LENGTH_METERS;
}

/**
 * 目標時間（分）からおおよその目標距離（メートル）を算出
 */
export function minutesToDistance(minutes: number): number {
  return (minutes / 60) * WALKING_SPEED_KMH * 1000;
}

/**
 * 起点をスタートとして、ループ状のお散歩ルートを生成する。
 * distanceMetersは往復の合計距離（目標距離）。
 * 複数のウェイポイントを使い円に近いルートを作る。
 * 
 * driving プロファイルを用いて主要道路（国道・県道）を優先し、
 * 山道や未舗装路を回避する。
 */
export async function generateWalkingRoute(
  startLat: number,
  startLng: number,
  targetDistanceMeters: number
): Promise<RouteResult> {
  // ルートの半径（概算）: 周長 = 2πr → r = distance / (2π)
  const radius = targetDistanceMeters / (2 * Math.PI);

  // 4つのウェイポイントを配置して円状ルートを形成
  const centerAngle = Math.random() * 2 * Math.PI;
  const centerLat = startLat + (radius * Math.cos(centerAngle)) / 111320;
  const centerLng =
    startLng +
    (radius * Math.sin(centerAngle)) / (111320 * Math.cos((startLat * Math.PI) / 180));

  const waypoints: [number, number][] = [];
  const numWaypoints = 4;

  for (let i = 0; i < numWaypoints; i++) {
    const angle = centerAngle + Math.PI + (2 * Math.PI * i) / numWaypoints;
    const wpLat = centerLat + (radius * Math.cos(angle)) / 111320;
    const wpLng =
      centerLng +
      (radius * Math.sin(angle)) / (111320 * Math.cos((centerLat * Math.PI) / 180));
    waypoints.push([wpLat, wpLng]);
  }

  // OSRM API call:  start -> wp1 -> wp2 -> wp3 -> wp4 -> start
  const allPoints: [number, number][] = [
    [startLat, startLng],
    ...waypoints,
    [startLat, startLng],
  ];

  // OSRM uses lng,lat order
  const coordsStr = allPoints.map(([lat, lng]) => `${lng},${lat}`).join(';');

  // ★ driving プロファイルを使用して主要道路（国道・県道）を優先
  const url = `${OSRM_API_BASE}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ルートの取得に失敗しました (HTTP ${response.status})`);
  }

  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('ルートが見つかりませんでした。別の設定を試してください。');
  }

  const route = data.routes[0];
  // GeoJSON coordinates are [lng, lat], we need [lat, lng]
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    (coord: [number, number]) => [coord[1], coord[0]]
  );

  // ★ 所要時間は車の速度で返ってくるため、歩行速度 (4km/h) で再計算する
  const walkingDurationSeconds = (route.distance / (WALKING_SPEED_KMH * 1000)) * 3600;

  return {
    coordinates,
    distanceMeters: route.distance,
    durationSeconds: walkingDurationSeconds,
  };
}

/**
 * 指定の座標からポリラインまでの最短距離を計算し、
 * ルート上で最も近い区間のインデックスを返す。
 */
export function findNearestSegmentIndex(
  lat: number,
  lng: number,
  routeCoords: [number, number][]
): number {
  let minDist = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const dist = pointToSegmentDistance(
      lat,
      lng,
      routeCoords[i][0],
      routeCoords[i][1],
      routeCoords[i + 1][0],
      routeCoords[i + 1][1]
    );
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

/**
 * 点P(px, py) と線分AB(ax,ay)-(bx,by) の距離を近似計算する
 */
function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return haversine(px, py, ax, ay);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const closestLat = ax + t * dx;
  const closestLng = ay + t * dy;
  return haversine(px, py, closestLat, closestLng);
}

/**
 * 2点間のハヴァーサイン距離（メートル）
 */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
