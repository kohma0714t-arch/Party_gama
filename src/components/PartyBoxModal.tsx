import React, { useState } from 'react';
import { ITEM_MAP } from '../game/catalog';
import { CHARACTERS } from '../game/constants';
import { GameSnapshot, ItemId } from '../game/types';
import { CharacterPortrait, ItemLivePreview } from './LivePreviews';

interface PartyBoxModalProps {
  snapshot: GameSnapshot;
  localPlayerId: string;
  onPick: (boxIndex: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  platform: '#2BB673',
  trap: '#E63946',
  shooty: '#FF7A00',
  moving: '#2D7FF9',
  special: '#7209B7',
  bomb: '#231F20',
};

const CATEGORY_NAMES: Record<string, string> = {
  platform: '足場',
  trap: '罠',
  shooty: '射撃',
  moving: '移動',
  special: '特殊',
  bomb: '爆弾',
};

export const PartyBoxModal: React.FC<PartyBoxModalProps> = ({ snapshot, localPlayerId, onPick }) => {
  const [hoveredItemId, setHoveredItemId] = useState<ItemId | null>(null);

  const localPlayer = snapshot.players.find((p) => p.id === localPlayerId);
  const alreadyPicked =
    localPlayer?.pickedBoxIndex !== null && localPlayer?.pickedBoxIndex !== undefined;

  const inspectItemId: ItemId | null =
    hoveredItemId ??
    localPlayer?.heldItemId ??
    snapshot.partyBox.find((s) => s.pickedByPlayerId === null)?.itemId ??
    snapshot.partyBox[0]?.itemId ??
    null;
  const inspectDef = inspectItemId ? ITEM_MAP[inspectItemId] : null;
  const timerPct =
    snapshot.phaseDuration > 0
      ? Math.max(0, Math.min(100, (snapshot.phaseTimer / snapshot.phaseDuration) * 100))
      : 100;

  return (
    <div className="modal-center">
      <div className="party-box-shell" style={{ width: 'min(920px, 96vw)' }}>
        {/* Decorative bunting */}
        <div className="garland-strip" />

        {/* Box Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 10,
            padding: '0 4px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: '#FFB703',
                border: '2.5px solid #231F20',
                borderRadius: 12,
                padding: '5px 12px',
                fontWeight: 800,
                fontSize: 18,
                boxShadow: '2px 2px 0 #231F20',
              }}
            >
              PARTY BOX!
            </div>
            <div style={{ color: '#FFFDF7', fontWeight: 800, fontSize: 14, textShadow: '1.5px 1.5px 0 #231F20' }}>
              {alreadyPicked
                ? '他のプレイヤーの選択を待っています...'
                : '動きと形を見て、今ラウンドのギミックを1つ選ぼう！'}
            </div>
          </div>

          <div
            className="sketch-pill"
            style={{
              padding: '5px 14px',
              fontSize: 16,
              fontWeight: 800,
              background: snapshot.phaseTimer <= 4 ? '#E63946' : '#FFFDF7',
              color: snapshot.phaseTimer <= 4 ? '#FFFDF7' : '#231F20',
            }}
          >
            残り {Math.ceil(snapshot.phaseTimer)}秒
          </div>
        </div>

        {/* Timer Bar */}
        <div
          style={{
            height: 9,
            background: '#4A311E',
            borderRadius: 999,
            border: '2px solid #231F20',
            overflow: 'hidden',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: `${timerPct}%`,
              height: '100%',
              background: snapshot.phaseTimer <= 4 ? '#E63946' : '#FFB703',
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        {/* Wooden Crate Interior */}
        <div className="party-box-interior">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(152px, 1fr))',
              gap: 10,
            }}
          >
            {snapshot.partyBox.map((slot) => {
              const def = ITEM_MAP[slot.itemId];
              const picker = slot.pickedByPlayerId
                ? snapshot.players.find((p) => p.id === slot.pickedByPlayerId)
                : null;
              const pickerChar = picker
                ? CHARACTERS.find((c) => c.id === picker.character)
                : null;
              const isMine = picker?.id === localPlayerId;
              const disabled = alreadyPicked || Boolean(picker);

              return (
                <button
                  key={slot.index}
                  type="button"
                  className="gimmick-slot"
                  disabled={disabled}
                  onMouseEnter={() => setHoveredItemId(slot.itemId)}
                  onFocus={() => setHoveredItemId(slot.itemId)}
                  onClick={() => onPick(slot.index)}
                  style={{
                    minHeight: 132,
                    background: isMine ? '#FFF3BF' : picker ? '#E8DFD3' : '#FFFDF7',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: '#FFF',
                        background: CATEGORY_COLORS[def.category],
                        padding: '1px 7px',
                        borderRadius: 999,
                        border: '1.5px solid #231F20',
                      }}
                    >
                      {CATEGORY_NAMES[def.category]}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#6D6875' }}>
                      {def.w}×{def.h}
                    </span>
                  </div>

                  {/* Live animated gimmick canvas */}
                  <ItemLivePreview itemId={slot.itemId} width={144} height={76} />

                  <div style={{ fontSize: 13, fontWeight: 800, color: '#231F20' }}>
                    {def.nameJa}
                  </div>

                  {picker && (
                    <div className="get-stamp">
                      <div
                        style={{
                          background: isMine ? '#FFB703' : '#FFFDF7',
                          border: '2.5px solid #231F20',
                          borderRadius: 12,
                          padding: '4px 10px',
                          boxShadow: '2px 2px 0 #231F20',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <CharacterPortrait character={picker.character} size={28} />
                        <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: pickerChar?.badgeColor ?? '#231F20' }}>
                            GET!
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 800 }}>{picker.name}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Inspector Strip */}
          {inspectDef && (
            <div
              style={{
                marginTop: 12,
                background: '#FFFDF7',
                border: '2.5px solid #231F20',
                borderRadius: 12,
                padding: '9px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#FFF',
                    background: CATEGORY_COLORS[inspectDef.category],
                    padding: '3px 9px',
                    borderRadius: 999,
                    border: '2px solid #231F20',
                  }}
                >
                  {CATEGORY_NAMES[inspectDef.category]}
                </span>
                <strong style={{ fontSize: 15 }}>{inspectDef.nameJa}</strong>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4F4A47' }}>
                  {inspectDef.descriptionJa}
                </span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6D6875' }}>
                {inspectDef.rotatable ? 'Rキーで回転可' : inspectDef.flippable ? 'Fキーで反転可' : '固定向き'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
