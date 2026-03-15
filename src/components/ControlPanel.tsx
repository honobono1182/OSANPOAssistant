import { useState } from 'react';
import {
  Footprints,
  Clock,
  Route,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Coffee,
  TreePine,
  Store,
  Landmark,
  XCircle,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { stepsToDistance, minutesToDistance, type WaypointInput } from '../services/RoutingService';

interface ControlPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onGenerateRoute: (targetDistanceMeters: number, waypoint: WaypointInput) => void;
  isGenerating: boolean;
  routeInfo: {
    distanceMeters: number;
    durationSeconds: number;
  } | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type InputMode = 'steps' | 'time';

export function ControlPanel({
  isOpen,
  onToggle,
  onGenerateRoute,
  isGenerating,
  routeInfo,
  theme,
  onToggleTheme,
}: ControlPanelProps) {
  const [inputMode, setInputMode] = useState<InputMode>('steps');
  const [targetSteps, setTargetSteps] = useState(3000);
  const [targetMinutes, setTargetMinutes] = useState(30);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // Waypoint states
  const [waypointMode, setWaypointMode] = useState<'none' | 'text' | 'category'>('none');
  const [waypointText, setWaypointText] = useState('');
  const [waypointCategory, setWaypointCategory] = useState('');

  const handleGenerate = () => {
    let distance: number;
    if (inputMode === 'steps') {
      distance = stepsToDistance(targetSteps);
    } else {
      distance = minutesToDistance(targetMinutes);
    }

    let waypoint: WaypointInput = { type: 'none' };
    if (waypointMode === 'text' && waypointText.trim() !== '') {
      waypoint = { type: 'text', text: waypointText.trim() };
    } else if (waypointMode === 'category' && waypointCategory !== '') {
      waypoint = { type: 'category', category: waypointCategory };
    }

    onGenerateRoute(distance, waypoint);
  };

  const estimatedDistance =
    inputMode === 'steps'
      ? stepsToDistance(targetSteps)
      : minutesToDistance(targetMinutes);

  return (
    <div className={`control-panel slide-in ${isOpen ? '' : 'collapsed'}`}>
      {/* Mobile Drag Handle */}
      <div 
        className="drag-handle-container"
        onClick={onToggle}
        aria-label={isOpen ? "パネルを最小化" : "パネルを展開"}
        role="button"
        tabIndex={0}
      >
        <div className="drag-handle" />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-accent), #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Route size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
              お散歩アシスタント
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
              ルートを自動生成
            </p>
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <div className="divider" />

      {/* Settings Accordion */}
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: isSettingsOpen ? '16px' : '0',
        }}
      >
        <span>ルート設定</span>
        {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isSettingsOpen && (
        <div className="fade-in">
          {/* Input Mode Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--color-accent-soft)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px',
            marginBottom: '20px',
          }}>
            <button
              onClick={() => setInputMode('steps')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                background: inputMode === 'steps' ? 'var(--color-accent)' : 'transparent',
                color: inputMode === 'steps' ? 'white' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Footprints size={14} />
              歩数
            </button>
            <button
              onClick={() => setInputMode('time')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                background: inputMode === 'time' ? 'var(--color-accent)' : 'transparent',
                color: inputMode === 'time' ? 'white' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Clock size={14} />
              時間
            </button>
          </div>

          {/* Steps Input */}
          {inputMode === 'steps' && (
            <div className="form-group fade-in">
              <label className="form-label">
                <Footprints size={14} />
                目標歩数
              </label>
              <input
                type="number"
                className="form-input"
                value={targetSteps}
                onChange={(e) => setTargetSteps(Math.max(500, Number(e.target.value)))}
                min={500}
                max={50000}
                step={500}
              />
              <input
                type="range"
                className="range-slider"
                value={targetSteps}
                onChange={(e) => setTargetSteps(Number(e.target.value))}
                min={500}
                max={20000}
                step={500}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                <span>500歩</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                  {targetSteps.toLocaleString()} 歩
                </span>
                <span>20,000歩</span>
              </div>
            </div>
          )}

          {/* Time Input */}
          {inputMode === 'time' && (
            <div className="form-group fade-in">
              <label className="form-label">
                <Clock size={14} />
                目標時間（分）
              </label>
              <input
                type="number"
                className="form-input"
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(Math.max(5, Number(e.target.value)))}
                min={5}
                max={180}
                step={5}
              />
              <input
                type="range"
                className="range-slider"
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(Number(e.target.value))}
                min={5}
                max={120}
                step={5}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                <span>5分</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                  {targetMinutes} 分
                </span>
                <span>120分</span>
              </div>
            </div>
          )}

          {/* Distance estimate */}
          <div style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            marginBottom: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
          }}>
            推定距離：約 {(estimatedDistance / 1000).toFixed(1)} km
          </div>

          {/* Waypoint Settings */}
          <div className="form-group fade-in" style={{ marginTop: '16px', marginBottom: '24px' }}>
            <label className="form-label" style={{ marginBottom: '12px' }}>
              <MapPin size={14} />
              経由地（オプション）
            </label>
            
            {/* Category Quick Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <button
                className={`category-btn ${waypointMode === 'category' && waypointCategory === 'cafe' ? 'active' : ''}`}
                onClick={() => { setWaypointMode('category'); setWaypointCategory('cafe'); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${waypointMode === 'category' && waypointCategory === 'cafe' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: waypointMode === 'category' && waypointCategory === 'cafe' ? 'var(--color-accent-soft)' : 'transparent',
                  color: waypointMode === 'category' && waypointCategory === 'cafe' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all var(--transition-fast)'
                }}
              >
                <Coffee size={16} /> カフェ
              </button>
              <button
                className={`category-btn ${waypointMode === 'category' && waypointCategory === 'park' ? 'active' : ''}`}
                onClick={() => { setWaypointMode('category'); setWaypointCategory('park'); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${waypointMode === 'category' && waypointCategory === 'park' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: waypointMode === 'category' && waypointCategory === 'park' ? 'var(--color-accent-soft)' : 'transparent',
                  color: waypointMode === 'category' && waypointCategory === 'park' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all var(--transition-fast)'
                }}
              >
                <TreePine size={16} /> 公園
              </button>
              <button
                className={`category-btn ${waypointMode === 'category' && waypointCategory === 'convenience' ? 'active' : ''}`}
                onClick={() => { setWaypointMode('category'); setWaypointCategory('convenience'); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${waypointMode === 'category' && waypointCategory === 'convenience' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: waypointMode === 'category' && waypointCategory === 'convenience' ? 'var(--color-accent-soft)' : 'transparent',
                  color: waypointMode === 'category' && waypointCategory === 'convenience' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all var(--transition-fast)'
                }}
              >
                <Store size={16} /> コンビニ
              </button>
              <button
                className={`category-btn ${waypointMode === 'category' && waypointCategory === 'shrine' ? 'active' : ''}`}
                onClick={() => { setWaypointMode('category'); setWaypointCategory('shrine'); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${waypointMode === 'category' && waypointCategory === 'shrine' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: waypointMode === 'category' && waypointCategory === 'shrine' ? 'var(--color-accent-soft)' : 'transparent',
                  color: waypointMode === 'category' && waypointCategory === 'shrine' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all var(--transition-fast)'
                }}
              >
                <Landmark size={16} /> 神社/寺
              </button>
            </div>

            {/* Custom Text Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="場所の名前（例: 東京タワー）"
                value={waypointText}
                onChange={(e) => {
                  setWaypointText(e.target.value);
                  setWaypointMode('text');
                }}
                onFocus={() => {
                  if (waypointText) setWaypointMode('text');
                }}
                style={{
                  borderColor: waypointMode === 'text' ? 'var(--color-accent)' : 'var(--color-border)',
                  paddingRight: '36px',
                  fontSize: '14px'
                }}
              />
              {waypointMode !== 'none' && (
                <button
                  onClick={() => {
                    setWaypointMode('none');
                    setWaypointText('');
                    setWaypointCategory('');
                  }}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                  }}
                  aria-label="経由地をクリア"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
            
            {waypointMode !== 'none' && (
               <div className="fade-in" style={{ fontSize: '12px', color: 'var(--color-accent)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                 <MapPin size={12} fill="currentColor" opacity={0.2} />
                 経由地が設定されています
               </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="spinner" style={{ animation: 'spin 0.6s linear infinite' }} />
                ルートを生成中...
              </>
            ) : (
              <>
                <Route size={18} />
                お散歩ルートを作成
              </>
            )}
          </button>
        </div>
      )}

      {/* Route Information */}
      {routeInfo && (
        <div className="route-info fade-in" style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--color-text-primary)' }}>
            📍 生成されたルート
          </div>
          <div className="route-info-item">
            <span className="route-info-label">距離</span>
            <span className="route-info-value">
              {(routeInfo.distanceMeters / 1000).toFixed(2)} km
            </span>
          </div>
          <div className="route-info-item">
            <span className="route-info-label">推定歩数</span>
            <span className="route-info-value">
              {Math.round(routeInfo.distanceMeters / 0.7).toLocaleString()} 歩
            </span>
          </div>
          <div className="route-info-item">
            <span className="route-info-label">推定時間</span>
            <span className="route-info-value">
              {Math.round(routeInfo.durationSeconds / 60)} 分
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
