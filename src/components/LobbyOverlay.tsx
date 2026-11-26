import React, { useState } from 'react';
import { CHARACTERS, MAX_PLAYERS } from '../game/constants';
import { STAGE_LIST, STAGES } from '../game/stages';
import { CharacterId, GameRules, GameSnapshot, StageSelection } from '../game/types';
import { CharacterPortrait } from './LivePreviews';

interface LobbyOverlayProps {
  snapshot: GameSnapshot;
  roomCode: string;
  isHost: boolean;
  localPlayerId: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onSelectCharacter: (c: CharacterId) => void;
  onSelectStage: (s: StageSelection) => void;
  onUpdateRules: (r: Partial<GameRules>) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

const STAGE_ACCENTS: Record<string, string> = {
  random: '#FFB703',
  farm: '#52B788',
  rooftops: '#F4845F',
  windmill: '#4EA8DE',
  volcano: '#E63946',
};

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  snapshot,
  roomCode,
  isHost,
  localPlayerId,
  isFullscreen,
  onToggleFullscreen,
  onSelectCharacter,
  onSelectStage,
  onUpdateRules,
  onStartGame,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);

  const stageLabel =
    snapshot.stageSelection === 'random'
      ? '🎲 ランダム'
      : STAGES[snapshot.stageId]?.nameJa ?? snapshot.stageId;

  const copyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="overlay-layer"
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 12 }}
    >
      {/* Slim Top Bar only (Treehouse playground stays wide open) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div
          className="sketch-pill interactive"
          style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
        >
          <span style={{ fontSize: 13, fontWeight: 800 }}>
            ルーム: <strong style={{ color: '#2D7FF9', letterSpacing: 1.5 }}>{roomCode}</strong>
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#5C5552' }}>
            👥 {snapshot.players.length}/{MAX_PLAYERS}人
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#5C5552' }}>
            🗺 {stageLabel}
          </span>
          <button type="button" className="btn btn-sm btn-primary" onClick={copyInvite}>
            {copied ? 'コピー済み!' : '招待URL'}
          </button>
        </div>

        <div className="interactive" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowSettings(true)}>
            ⚙ ルーム設定
          </button>
          <button type="button" className="btn btn-sm" onClick={onToggleFullscreen}>
            {isFullscreen ? '⛶ 解除' : '⛶ 全画面'}
          </button>
          {isHost ? (
            <button type="button" className="btn btn-sm btn-green" onClick={onStartGame} style={{ padding: '7px 16px', fontSize: 14 }}>
              ▶ ゲームスタート！
            </button>
          ) : (
            <span className="sketch-pill" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 800 }}>
              ホストの開始待ち...
            </span>
          )}
          <button type="button" className="btn btn-sm" onClick={onLeave}>
            退出
          </button>
        </div>
      </div>

      {/* Subtle bottom movement hint pill */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="sketch-pill" style={{ padding: '4px 12px', fontSize: 11, fontWeight: 800, opacity: 0.9 }}>
          ツリーハウス練習中：A/D・←/→ 移動 ｜ Space/W ジャンプ ｜ E ダンス ｜ 右上の「⚙ ルーム設定」で参加者・キャラ・ステージ変更
        </div>
      </div>

      {/* Unified Room Settings Modal */}
      {showSettings && (
        <div className="modal-center" onClick={() => setShowSettings(false)}>
          <div
            className="wood-board"
            style={{ width: 'min(700px, 95vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="paper-panel" style={{ overflowY: 'auto', display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>⚙ ルーム設定（ルーム: {roomCode}）</h2>
                <button type="button" className="btn btn-sm" onClick={() => setShowSettings(false)}>
                  ✕ 閉じる
                </button>
              </div>

              {/* 1. Participants */}
              <div style={{ background: '#FFF', border: '2px solid #231F20', borderRadius: 12, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>
                    参加者 ({snapshot.players.length}/{MAX_PLAYERS})
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 6 }}>
                  {Array.from({ length: MAX_PLAYERS }).map((_, idx) => {
                    const p = snapshot.players[idx];
                    if (!p) {
                      return (
                        <div
                          key={idx}
                          style={{
                            height: 38,
                            borderRadius: 9,
                            border: '2px dashed #BDB5AC',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#8D857E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          空き枠
                        </div>
                      );
                    }
                    return (
                      <div
                        key={p.id}
                        style={{
                          height: 38,
                          padding: '2px 8px',
                          borderRadius: 9,
                          border: '2px solid #231F20',
                          background: p.id === localPlayerId ? '#FFF3BF' : '#FFFDF7',
                          fontSize: 12,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          overflow: 'hidden',
                        }}
                      >
                        <CharacterPortrait character={p.character} size={26} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Character Selection */}
              <div style={{ background: '#FFF', border: '2px solid #231F20', borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>自分のキャラクター</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CHARACTERS.map((c) => {
                    const selected = localPlayer?.character === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`btn btn-sm ${selected ? 'btn-primary' : ''}`}
                        onClick={() => onSelectCharacter(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px' }}
                      >
                        <CharacterPortrait character={c.id} size={26} dancing={selected} />
                        {c.nameJa}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Stage Selection (including Random) */}
              <div style={{ background: '#FFF', border: '2px solid #231F20', borderRadius: 12, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>ステージ選択</span>
                  {!isHost && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#6D6875' }}>※ホストのみ変更できます</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={!isHost}
                    className={`btn btn-sm ${snapshot.stageSelection === 'random' ? 'btn-primary' : ''}`}
                    onClick={() => onSelectStage('random')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <span>🎲</span>
                    ランダム
                  </button>
                  {STAGE_LIST.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      disabled={!isHost}
                      className={`btn btn-sm ${snapshot.stageSelection === st.id ? 'btn-blue' : ''}`}
                      onClick={() => onSelectStage(st.id as StageSelection)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: STAGE_ACCENTS[st.id] ?? '#999',
                          border: '1.5px solid #231F20',
                        }}
                      />
                      {st.nameJa}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Rules & Display */}
              <div style={{ background: '#FFF', border: '2px solid #231F20', borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>ゲームルール・表示設定</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, fontSize: 13, fontWeight: 700 }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>モード</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.rules.mode}
                      onChange={(e) => onUpdateRules({ mode: e.target.value as GameRules['mode'] })}
                      className="input-box"
                      style={{ width: 155, padding: '6px 8px', fontSize: 13 }}
                    >
                      <option value="party">パーティー対戦</option>
                      <option value="freeplay">フリープレイ</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>勝利ポイント目標</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.rules.targetScore}
                      onChange={(e) => onUpdateRules({ targetScore: Number(e.target.value) })}
                      className="input-box"
                      style={{ width: 155, padding: '6px 8px', fontSize: 13 }}
                    >
                      {[3, 5, 7, 10, 15].map((n) => (
                        <option key={n} value={n}>{n} pt</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>重力倍率</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.rules.gravityScale}
                      onChange={(e) => onUpdateRules({ gravityScale: Number(e.target.value) })}
                      className="input-box"
                      style={{ width: 155, padding: '6px 8px', fontSize: 13 }}
                    >
                      <option value={0.65}>低重力 (0.65x)</option>
                      <option value={1}>標準 (1.0x)</option>
                      <option value={1.35}>高重力 (1.35x)</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>ジャンプ力倍率</span>
                    <select
                      disabled={!isHost}
                      value={snapshot.rules.jumpScale}
                      onChange={(e) => onUpdateRules({ jumpScale: Number(e.target.value) })}
                      className="input-box"
                      style={{ width: 155, padding: '6px 8px', fontSize: 13 }}
                    >
                      <option value={0.85}>低め (0.85x)</option>
                      <option value={1}>標準 (1.0x)</option>
                      <option value={1.25}>ハイジャンプ (1.25x)</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>プレイヤー同士の衝突</span>
                    <input
                      disabled={!isHost}
                      type="checkbox"
                      checked={snapshot.rules.playerCollision}
                      onChange={(e) => onUpdateRules({ playerCollision: e.target.checked })}
                      style={{ width: 20, height: 20 }}
                    />
                  </label>

                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>画面表示</span>
                    <button type="button" className="btn btn-sm btn-blue" onClick={onToggleFullscreen}>
                      {isFullscreen ? '全画面を解除' : 'フルスクリーンにする'}
                    </button>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {isHost && (
                  <button
                    type="button"
                    className="btn btn-green"
                    onClick={() => {
                      setShowSettings(false);
                      onStartGame();
                    }}
                  >
                    ▶ この設定でスタート！
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={() => setShowSettings(false)}>
                  完了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
