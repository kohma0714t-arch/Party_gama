import React, { useState } from 'react';
import { ITEM_CATALOG, ITEM_MAP } from '../game/catalog';
import { CursorState, GameSnapshot, ItemCategory, ItemId } from '../game/types';
import { CharacterPortrait, ItemLivePreview } from './LivePreviews';

interface GameHUDProps {
  snapshot: GameSnapshot;
  localPlayerId: string;
  isHost: boolean;
  localCursor: CursorState;
  muted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onRotate: () => void;
  onFlip: () => void;
  onReturnLobby: () => void;
  onFreeplaySelect: (itemId: ItemId) => void;
  onFreeplayToggleTest: () => void;
  onFreeplayClear: () => void;
}

const PHASE_LABEL: Record<string, string> = {
  BOX_PICK: 'アイテム選択',
  PLACE: '配置フェーズ',
  COUNTDOWN: 'まもなくスタート',
  ACTION: 'レース中！',
  SCORE: 'ラウンド結果',
  PODIUM: '最終結果',
};

const FILTER_TABS: { id: 'all' | ItemCategory; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'platform', label: '足場' },
  { id: 'trap', label: '罠' },
  { id: 'shooty', label: '射撃' },
  { id: 'moving', label: '移動' },
  { id: 'special', label: '特殊' },
  { id: 'bomb', label: '爆弾' },
];

export const GameHUD: React.FC<GameHUDProps> = ({
  snapshot,
  localPlayerId,
  isHost,
  localCursor,
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onRotate,
  onFlip,
  onReturnLobby,
  onFreeplaySelect,
  onFreeplayToggleTest,
  onFreeplayClear,
}) => {
  const [catFilter, setCatFilter] = useState<'all' | ItemCategory>('all');
  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const heldDef = localPlayer?.heldItemId ? ITEM_MAP[localPlayer.heldItemId] : null;
  const isFreeplay = snapshot.rules.mode === 'freeplay';
  const filteredItems =
    catFilter === 'all' ? ITEM_CATALOG : ITEM_CATALOG.filter((i) => i.category === catFilter);

  return (
    <div
      className="overlay-layer"
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 10 }}
    >
      {/* Top HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div className="sketch-pill interactive" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>
            {isFreeplay ? 'フリープレイ' : `R${snapshot.round} / ${snapshot.rules.maxRounds}`}
          </span>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#2D7FF9' }}>
            {isFreeplay ? (snapshot.freeplayTesting ? 'テストラン中' : 'コース編集中') : PHASE_LABEL[snapshot.phase]}
          </span>
          {!isFreeplay && (snapshot.phase === 'PLACE' || snapshot.phase === 'ACTION') && (
            <span
              style={{
                background: snapshot.phaseTimer <= 5 ? '#E63946' : '#FFB703',
                color: snapshot.phaseTimer <= 5 ? '#FFF' : '#231F20',
                padding: '2px 9px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 13,
                border: '2px solid #231F20',
              }}
            >
              {Math.ceil(snapshot.phaseTimer)}秒
            </span>
          )}
        </div>

        {/* Mini Scoreboard */}
        {!isFreeplay && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {snapshot.players.map((p) => (
              <div
                key={p.id}
                className="sketch-pill"
                style={{
                  padding: '2px 10px 2px 6px',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: p.id === localPlayerId ? '#FFF3BF' : '#FFFDF7',
                  opacity: snapshot.phase === 'ACTION' && !p.alive ? 0.55 : 1,
                }}
              >
                <CharacterPortrait character={p.character} size={24} />
                <span>{p.name}</span>
                <span style={{ color: '#2D7FF9' }}>{p.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Right Controls */}
        <div className="interactive" style={{ display: 'flex', gap: 6 }}>
          {isFreeplay && isHost && (
            <>
              <button
                type="button"
                className={`btn btn-sm ${snapshot.freeplayTesting ? 'btn-primary' : 'btn-green'}`}
                onClick={onFreeplayToggleTest}
              >
                {snapshot.freeplayTesting ? '編集に戻る' : 'テストラン！'}
              </button>
              {!snapshot.freeplayTesting && (
                <button type="button" className="btn btn-sm btn-red" onClick={onFreeplayClear}>
                  全消去
                </button>
              )}
            </>
          )}
          <button type="button" className="btn btn-sm" onClick={onToggleFullscreen}>
            {isFullscreen ? '⛶ 解除' : '⛶ 全画面'}
          </button>
          <button type="button" className="btn btn-sm" onClick={onToggleMute}>
            {muted ? '🔇 音OFF' : '🔊 音ON'}
          </button>
          {isHost && (
            <button type="button" className="btn btn-sm" onClick={onReturnLobby}>
              ロビーへ
            </button>
          )}
        </div>
      </div>

      {/* Countdown center display */}
      {snapshot.phase === 'COUNTDOWN' && (
        <div
          style={{
            alignSelf: 'center',
            background: '#FFB703',
            border: '4px solid #231F20',
            borderRadius: 24,
            boxShadow: '6px 6px 0 #231F20',
            padding: '16px 36px',
            fontSize: 48,
            fontWeight: 800,
          }}
        >
          {Math.max(1, Math.ceil(snapshot.phaseTimer))}
        </div>
      )}

      {/* Bottom Bar */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {isFreeplay && !snapshot.freeplayTesting ? (
          <div className="wood-board interactive" style={{ padding: 6, borderRadius: 16, maxWidth: '96vw' }}>
            <div className="paper-panel" style={{ padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`btn btn-sm ${catFilter === tab.id ? 'btn-blue' : ''}`}
                      onClick={() => setCatFilter(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#5C5552' }}>
                  {heldDef ? `${heldDef.nameJa}: ${heldDef.descriptionJa} ｜ ` : ''}
                  左クリック:設置 / 右クリック:削除 / R:回転 / F:反転
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {filteredItems.map((item) => {
                  const selected = localPlayer?.heldItemId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="gimmick-slot"
                      onClick={() => onFreeplaySelect(item.id)}
                      style={{
                        minWidth: 74,
                        padding: '4px 6px',
                        background: selected ? '#FFF3BF' : '#FFFDF7',
                        borderColor: selected ? '#2D7FF9' : '#231F20',
                      }}
                    >
                      <ItemLivePreview itemId={item.id} width={60} height={38} />
                      <span style={{ fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>{item.nameJa}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : snapshot.phase === 'PLACE' ? (
          <div
            className="sketch-pill interactive"
            style={{
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            {localPlayer?.hasPlaced ? (
              <span>配置完了！他のプレイヤーを待っています...</span>
            ) : heldDef ? (
              <>
                <ItemLivePreview
                  itemId={heldDef.id}
                  width={52}
                  height={34}
                  rot={heldDef.rotatable ? localCursor.rot : 0}
                  flipX={heldDef.flippable ? localCursor.flipX : false}
                />
                <span>
                  配置中: <strong style={{ color: '#2D7FF9' }}>{heldDef.nameJa}</strong>
                  {heldDef.id === 'portal' &&
                    (localPlayer?.portalFirstPos ? '（2個目・出口を配置）' : '（1個目・入口を配置）')}
                </span>
                <span>左クリックで配置</span>
                {heldDef.rotatable && (
                  <button type="button" className="btn btn-sm" onClick={onRotate}>
                    R: 回転 ({localCursor.rot * 90}°)
                  </button>
                )}
                {heldDef.flippable && (
                  <button type="button" className="btn btn-sm" onClick={onFlip}>
                    F: 反転
                  </button>
                )}
              </>
            ) : null}
          </div>
        ) : snapshot.phase === 'ACTION' ? (
          <div className="sketch-pill" style={{ padding: '4px 12px', fontSize: 11, fontWeight: 800 }}>
            移動: A/D・←/→ ｜ ダッシュ: Shift ｜ ジャンプ・壁ジャンプ: Space・W ｜ しゃがみ: S・↓ ｜ ダンス: E
          </div>
        ) : null}
      </div>
    </div>
  );
};
