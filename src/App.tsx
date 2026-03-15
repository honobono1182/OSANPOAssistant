import { useState, useCallback, useEffect } from 'react';
import { Locate, Menu, X, Navigation } from 'lucide-react';
import { useGeolocation } from './hooks/useGeolocation';
import { useTheme } from './hooks/useTheme';
import { ControlPanel } from './components/ControlPanel';
import { OSMMap } from './components/OSMMap';
import {
  generateWalkingRoute,
  findNearestSegmentIndex,
  type RouteResult,
  type WaypointInput,
} from './services/RoutingService';

function App() {
  const { position, error: geoError, isLoading: geoLoading, isTracking, startTracking } = useGeolocation();
  const { theme, toggleTheme } = useTheme();

  const [panelOpen, setPanelOpen] = useState(true);
  const [followUser, setFollowUser] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);
  const [passedSegmentIndex, setPassedSegmentIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // ルート生成
  const handleGenerateRoute = useCallback(
    async (targetDistanceMeters: number, waypoint: WaypointInput) => {
      if (!position) {
        setRouteError('現在地が取得できていません。位置情報を許可してください。');
        return;
      }

      setIsGenerating(true);
      setRouteError(null);

      try {
        const result: RouteResult = await generateWalkingRoute(
          position.latitude,
          position.longitude,
          targetDistanceMeters,
          waypoint
        );
        setRouteCoords(result.coordinates);
        setRouteInfo({
          distanceMeters: result.distanceMeters,
          durationSeconds: result.durationSeconds,
        });
        setPassedSegmentIndex(0);
        setIsNavigating(true);

        // GPSトラッキングを開始
        if (!isTracking) {
          startTracking();
        }
      } catch (err) {
        setRouteError(
          err instanceof Error ? err.message : 'ルートの生成中にエラーが発生しました。'
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [position, isTracking, startTracking]
  );

  // ナビゲーション中は現在地の移動でルート通過判定を更新する
  useEffect(() => {
    if (!isNavigating || !position || !routeCoords) return;

    // 最新の現在地をもとに最も近いセグメントを探すが、
    // 大きく逆行したりショートカットしないよう、現在の passedSegmentIndex から少し先（例えば +5 程度）までを探すのが安全
    const searchRange = Math.min(routeCoords.length - 1, passedSegmentIndex + 10);
    const searchCoords = routeCoords.slice(passedSegmentIndex, searchRange + 1);
    
    // スライスした配列で一番近いインデックスを探す
    const localNearestIdx = findNearestSegmentIndex(
      position.latitude,
      position.longitude,
      searchCoords
    );

    // 全体インデックスに直す
    const globalNearestIdx = passedSegmentIndex + localNearestIdx;

    // 後退はしない（戻ることを防ぐ）
    setPassedSegmentIndex((prev) => Math.max(prev, globalNearestIdx));
  }, [position, isNavigating, routeCoords, passedSegmentIndex]);

  // 現在地に戻るボタン
  const handleRecenter = useCallback(() => {
    setFollowUser(true);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* マップ全画面 */}
      <OSMMap
        position={position}
        theme={theme}
        routeCoords={routeCoords}
        passedSegmentIndex={passedSegmentIndex}
        followUser={followUser}
      />

      {/* パネル開閉ボタン (パネルが閉じているとき) */}
      {!panelOpen && (
        <button
          className="btn-float toggle-panel-btn desktop-only-btn"
          onClick={() => setPanelOpen(true)}
          aria-label="メニューを開く"
        >
          <Menu size={20} />
        </button>
      )}

      {/* コントロールパネル（オーバーレイ） */}
      <ControlPanel
        isOpen={panelOpen}
        onToggle={() => setPanelOpen(!panelOpen)}
        onGenerateRoute={handleGenerateRoute}
        isGenerating={isGenerating}
        routeInfo={routeInfo}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* パネル閉じるボタン */}
      {panelOpen && (
        <button
          className="btn-float desktop-only-btn"
          style={{ position: 'absolute', top: '16px', left: '392px', zIndex: 1001 }}
          onClick={() => setPanelOpen(false)}
          aria-label="パネルを閉じる"
        >
          <X size={18} />
        </button>
      )}

      {/* 現在地に戻るボタン */}
      <button
        className="btn-float"
        style={{ position: 'absolute', bottom: '32px', right: '16px' }}
        onClick={handleRecenter}
        aria-label="現在地に戻る"
      >
        <Locate size={20} />
      </button>

      {/* ナビゲーション中のステータスバー */}
      {isNavigating && routeInfo && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'var(--color-bg-panel)',
            backdropFilter: 'blur(var(--blur-panel))',
            WebkitBackdropFilter: 'blur(var(--blur-panel))',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-panel)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <Navigation size={16} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            ナビゲーション中
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {(routeInfo.distanceMeters / 1000).toFixed(1)} km
          </span>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            約 {Math.round(routeInfo.durationSeconds / 60)} 分
          </span>
          <button
            onClick={() => {
              setIsNavigating(false);
              setRouteCoords(null);
              setRouteInfo(null);
              setPassedSegmentIndex(0);
            }}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-sans)',
              transition: 'all var(--transition-fast)',
            }}
          >
            終了
          </button>
        </div>
      )}

      {/* ローディング表示 */}
      {geoLoading && !position && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2000,
            background: 'var(--color-bg-panel)',
            backdropFilter: 'blur(var(--blur-panel))',
            WebkitBackdropFilter: 'blur(var(--blur-panel))',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-panel)',
            padding: '32px 48px',
            textAlign: 'center',
          }}
        >
          <div className="spinner" style={{ margin: '0 auto 16px', borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
            現在地を取得中...
          </p>
        </div>
      )}

      {/* エラー表示 */}
      {(geoError || routeError) && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            fontSize: '13px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
          }}
        >
          {geoError || routeError}
        </div>
      )}
    </div>
  );
}

export default App;
