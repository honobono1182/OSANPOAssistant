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

export type WaypointInput = 
  | { type: 'none' }
  | { type: 'text'; text: string }
  | { type: 'category'; category: string };

const OSRM_API_BASE = 'https://router.project-osrm.org';

// 歩幅定数（メートル）
const STEP_LENGTH_METERS = 0.7;
// 歩行速度（km/h）
const WALKING_SPEED_KMH = 4.0;

/**
 * 経由地のフリーワード検索 (Nominatim API)
 */
export async function geocodeLocation(
  query: string,
  lat: number,
  lng: number
): Promise<[number, number]> {
  // 現在地周辺を優先して検索
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&limit=1&viewbox=${lng - 0.1},${lat - 0.1},${lng + 0.1},${lat + 0.1}&bounded=0`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'ja' } });
  if (!res.ok) throw new Error('場所の検索に失敗しました');
  const data = await res.json();
  if (!data || data.length === 0) {
    throw new Error(`「${query}」が見つかりませんでした。別の場所を試してください。`);
  }
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

/**
 * 現在地周辺のカテゴリPOI検索 (Overpass API)
 */
export async function findPOINearby(
  lat: number,
  lng: number,
  category: string,
  radiusMeters: number
): Promise<[number, number]> {
  let queryBody = '';
  switch (category) {
    case 'cafe':
      queryBody = `node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});`;
      break;
    case 'park':
      queryBody = `
        node["leisure"="park"](around:${radiusMeters},${lat},${lng});
        way["leisure"="park"](around:${radiusMeters},${lat},${lng});
        relation["leisure"="park"](around:${radiusMeters},${lat},${lng});
      `;
      break;
    case 'convenience':
      queryBody = `node["shop"="convenience"](around:${radiusMeters},${lat},${lng});`;
      break;
    case 'shrine':
      queryBody = `
        node["amenity"="place_of_worship"](around:${radiusMeters},${lat},${lng});
        way["amenity"="place_of_worship"](around:${radiusMeters},${lat},${lng});
      `;
      break;
    default:
      throw new Error('未対応のカテゴリです');
  }

  const overpassQuery = `
    [out:json][timeout:15];
    (
      ${queryBody}
    );
    out center limit 20;
  `;

  const url = `https://overpass-api.de/api/interpreter`;
  const res = await fetch(url, {
    method: 'POST',
    body: overpassQuery,
  });

  if (!res.ok) throw new Error('POIの検索に失敗しました');
  const data = await res.json();
  if (!data.elements || data.elements.length === 0) {
    throw new Error('指定された範囲内に該当する場所が見つかりませんでした。');
  }

  // ランダムに1件選択
  const element = data.elements[Math.floor(Math.random() * data.elements.length)];
  const resultLat = element.lat || element.center?.lat;
  const resultLng = element.lon || element.center?.lon;

  if (!resultLat || !resultLng) {
    throw new Error('POIの座標が取得できませんでした');
  }

  return [resultLat, resultLng];
}

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
  targetDistanceMeters: number,
  waypointInput: WaypointInput = { type: 'none' }
): Promise<RouteResult> {
  // 1. 経由地座標の取得
  let waypointCoords: [number, number] | null = null;
  
  if (waypointInput.type === 'text') {
    waypointCoords = await geocodeLocation(waypointInput.text, startLat, startLng);
  } else if (waypointInput.type === 'category') {
    // 検索半径は目標距離の半分（往復を考慮） + 余白
    const searchRadius = Math.max(500, targetDistanceMeters / 2);
    waypointCoords = await findPOINearby(startLat, startLng, waypointInput.category, searchRadius);
  }

  let allPoints: [number, number][] = [];

  if (!waypointCoords) {
    // 経由地がない場合：従来のランダムループ生成
    const radius = targetDistanceMeters / (2 * Math.PI);
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

    allPoints = [
      [startLat, startLng],
      ...waypoints,
      [startLat, startLng],
    ];
  } else {
    // 経由地がある場合：行きと帰りで経路を変えるため迂回ポイントを追加
    const distToWp = haversine(startLat, startLng, waypointCoords[0], waypointCoords[1]);
    
    // 余剰距離 (目標距離から直線往復距離を引いたもの)
    const surplus = Math.max(0, targetDistanceMeters - (distToWp * 2));
    
    // 経度・緯度の差分
    const dx = waypointCoords[1] - startLng;
    const dy = waypointCoords[0] - startLat;
    const len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
    
    // 垂直方向の単位ベクトル
    const nx = -dy / len;
    const ny = dx / len;
    
    // 片道の膨らみ幅 (余剰距離の1/4程度をオフセットとする)
    const offsetMeters = surplus / 4;
    // 緯度の1度は約111320m
    const offsetDegree = offsetMeters / 111320;
    
    // 経度補正（緯度によって経度1度の距離が変わるため）
    const cosLat = Math.cos((startLat * Math.PI) / 180);
    const offsetLngDegree = offsetDegree / (cosLat || 1);
    
    // 中間地点を行き(40%地点)と帰り(60%地点)に配置し、左右に膨らませる
    const detour1Lat = startLat + dy * 0.4 + ny * offsetDegree;
    const detour1Lng = startLng + dx * 0.4 + nx * offsetLngDegree;
    
    const detour2Lat = startLat + dy * 0.6 - ny * offsetDegree;
    const detour2Lng = startLng + dx * 0.6 - nx * offsetLngDegree;
    
    allPoints = [
      [startLat, startLng],
      [detour1Lat, detour1Lng],
      waypointCoords,
      [detour2Lat, detour2Lng],
      [startLat, startLng]
    ];
  }

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
