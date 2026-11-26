import React, { useState } from 'react';
import { TransportMode } from '../net/transport';
import { CharacterPortrait } from './LivePreviews';

interface TitleScreenProps {
  initialRoomCode: string;
  loading: boolean;
  error: string | null;
  isFullscreen: boolean;
  muted: boolean;
  bgmVolume: number;
  sfxVolume: number;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onChangeBgmVolume: (v: number) => void;
  onChangeSfxVolume: (v: number) => void;
  onCreateRoom: (name: string, mode: TransportMode) => void;
  onJoinRoom: (name: string, code: string, mode: TransportMode) => void;
}

type HomeModal = null | 'create' | 'join' | 'settings';

function loadSavedName(): string {
  try {
    const saved = window.localStorage.getItem('tc_player_name');
    if (saved && saved.trim()) return saved.trim().slice(0, 14);
  } catch {
    // Ignore storage restriction
  }
  return 'プレイヤー';
}

function saveName(name: string): void {
  try {
    window.localStorage.setItem('tc_player_name', name);
  } catch {
    // Ignore storage restriction
  }
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  initialRoomCode,
  loading,
  error,
  isFullscreen,
  muted,
  bgmVolume,
  sfxVolume,
  onToggleFullscreen,
  onToggleMute,
  onChangeBgmVolume,
  onChangeSfxVolume,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [name, setName] = useState<string>(loadSavedName);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [mode, setMode] = useState<TransportMode>('webrtc');
  const [activeModal, setActiveModal] = useState<HomeModal>(
    initialRoomCode.length >= 4 ? 'join' : null
  );

  const handleNameChange = (val: string) => {
    setName(val);
    saveName(val);
  };

  return (
    <div className="title-backdrop">
      {/* Top Center Wooden Title Signboard */}
      <div
        className="wood-sign"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          maxWidth: '94vw',
        }}
      >
        <CharacterPortrait character="chicken" size={60} dancing />
        <div style={{ textAlign: 'center' }}>
          <h1 className="title-logo">TRICKY CRITTERS</h1>
          <p className="title-sub">最大6人オンライン・コース自作パーティアクション</p>
        </div>
        <CharacterPortrait character="horse" size={60} dancing facing={-1} />
      </div>

      {/* Center Vertical 3-Item Menu */}
      <div className="home-menu-stack">
        <button
          type="button"
          className="btn btn-primary home-menu-btn"
          disabled={loading}
          onClick={() => setActiveModal('create')}
        >
          <span>🏠 部屋を作る</span>
        </button>

        <button
          type="button"
          className="btn btn-green home-menu-btn"
          disabled={loading}
          onClick={() => setActiveModal('join')}
        >
          <span>🚪 部屋に入る</span>
        </button>

        <button
          type="button"
          className="btn home-menu-btn"
          disabled={loading}
          onClick={() => setActiveModal('settings')}
        >
          <span>⚙ 設定</span>
        </button>

        {error && !activeModal && (
          <div className="error-banner" style={{ textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>

      {/* Subtle Bottom Status Pill */}
      <div
        className="sketch-pill"
        style={{
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <span>名前: {name.trim() || 'プレイヤー'}</span>
        <span>｜</span>
        <span>通信: {mode === 'webrtc' ? 'オンラインP2P' : '同一PC多窓テスト'}</span>
        <span>｜</span>
        <span>最大6人プレイ対応</span>
      </div>

      {/* Modal 1: Create Room */}
      {activeModal === 'create' && (
        <div className="modal-center" onClick={() => !loading && setActiveModal(null)}>
          <div
            className="wood-board"
            style={{ width: 'min(480px, 94vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="paper-panel" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>🏠 部屋を作る</h2>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={loading}
                  onClick={() => setActiveModal(null)}
                >
                  ✕
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  プレイヤー名
                </label>
                <input
                  className="input-box"
                  value={name}
                  maxLength={14}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="お名前を入力"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  通信モード
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === 'webrtc' ? 'btn-blue' : ''}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setMode('webrtc')}
                  >
                    オンラインP2P
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === 'local' ? 'btn-primary' : ''}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setMode('local')}
                  >
                    同一PC多窓テスト
                  </button>
                </div>
              </div>

              {error && <div className="error-banner">{error}</div>}

              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 16, padding: '12px 18px' }}
                disabled={loading}
                onClick={() => onCreateRoom(name, mode)}
              >
                {loading ? '接続中...' : 'ルームを作成する（最大6人）'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Join Room */}
      {activeModal === 'join' && (
        <div className="modal-center" onClick={() => !loading && setActiveModal(null)}>
          <div
            className="wood-board"
            style={{ width: 'min(450px, 94vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="paper-panel" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>🚪 部屋に入る</h2>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={loading}
                  onClick={() => setActiveModal(null)}
                >
                  ✕
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  プレイヤー名
                </label>
                <input
                  className="input-box"
                  value={name}
                  maxLength={14}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="お名前を入力"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  通信モード
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === 'webrtc' ? 'btn-blue' : ''}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setMode('webrtc')}
                  >
                    オンラインP2P
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${mode === 'local' ? 'btn-primary' : ''}`}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setMode('local')}
                  >
                    同一PC多窓テスト
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  ルームコード（5桁）
                </label>
                <input
                  className="input-box"
                  value={roomCode}
                  maxLength={5}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && roomCode.trim().length >= 4 && !loading) {
                      onJoinRoom(name, roomCode, mode);
                    }
                  }}
                  placeholder="例: AB23C"
                  style={{ textTransform: 'uppercase', letterSpacing: 3, fontSize: 18, textAlign: 'center' }}
                />
              </div>

              {error && <div className="error-banner">{error}</div>}

              <button
                type="button"
                className="btn btn-green"
                style={{ fontSize: 16, padding: '12px 18px' }}
                disabled={loading || roomCode.trim().length < 4}
                onClick={() => onJoinRoom(name, roomCode, mode)}
              >
                {loading ? '参加中...' : 'この部屋に参加する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Settings */}
      {activeModal === 'settings' && (
        <div className="modal-center" onClick={() => setActiveModal(null)}>
          <div
            className="wood-board"
            style={{ width: 'min(500px, 94vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="paper-panel" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>⚙ 設定</h2>
                <button type="button" className="btn btn-sm" onClick={() => setActiveModal(null)}>
                  ✕
                </button>
              </div>

              <div style={{ background: '#FFF', border: '2px solid #231F20', borderRadius: 12, padding: 11, display: 'grid', gap: 10 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 800 }}>
                  <span>プレイヤー名</span>
                  <input
                    className="input-box"
                    style={{ width: 190, padding: '6px 10px', fontSize: 13 }}
                    value={name}
                    maxLength={14}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </label>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 800 }}>
                  <span>通信モード既定値</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${mode === 'webrtc' ? 'btn-blue' : ''}`}
                      onClick={() => setMode('webrtc')}
                    >
                      オンラインP2P
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${mode === 'local' ? 'btn-primary' : ''}`}
                      onClick={() => setMode('local')}
                    >
                      多窓テスト
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 800 }}>
                  <span>画面表示</span>
                  <button type="button" className="btn btn-sm btn-blue" onClick={onToggleFullscreen}>
                    {isFullscreen ? '⛶ フルスクリーン解除' : '⛶ フルスクリーンにする'}
                  </button>
                </div>
              </div>

              <div style={{ background: '#FFF', border: '2px solid #231F20', borderRadius: 12, padding: 11, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 800 }}>
                  <span>サウンド</span>
                  <button type="button" className="btn btn-sm" onClick={onToggleMute}>
                    {muted ? '🔇 ミュート中' : '🔊 サウンドON'}
                  </button>
                </div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700 }}>
                  <span>BGM 音量 ({Math.round(bgmVolume * 100)}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={bgmVolume}
                    onChange={(e) => onChangeBgmVolume(Number(e.target.value))}
                    style={{ width: 170 }}
                  />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700 }}>
                  <span>効果音(SE) 音量 ({Math.round(sfxVolume * 100)}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={sfxVolume}
                    onChange={(e) => onChangeSfxVolume(Number(e.target.value))}
                    style={{ width: 170 }}
                  />
                </label>
              </div>

              <div style={{ background: '#F6EFE2', border: '2px solid #231F20', borderRadius: 12, padding: '9px 12px', fontSize: 12, fontWeight: 700, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 800, marginBottom: 2 }}>基本操作ガイド</div>
                <div>移動: A/D・矢印 ｜ ダッシュ: Shift ｜ ジャンプ・壁ジャンプ: Space・W</div>
                <div>しゃがみ: S・↓ ｜ 配置: クリック ｜ 回転: R ｜ 反転: F ｜ ダンス: E</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button type="button" className="btn btn-primary" onClick={() => setActiveModal(null)}>
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
