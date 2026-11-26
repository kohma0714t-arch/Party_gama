import React from 'react';
import { CHARACTERS } from '../game/constants';
import { GameSnapshot } from '../game/types';
import { CharacterPortrait } from './LivePreviews';

interface ScoreboardModalProps {
  snapshot: GameSnapshot;
  isHost: boolean;
  onNext: () => void;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({ snapshot, isHost, onNext }) => {
  const summary = snapshot.lastSummary;
  if (!summary) return null;

  const target = snapshot.rules.targetScore;
  const sorted = [...summary.entries].sort((a, b) => b.newTotal - a.newTotal);

  return (
    <div className="modal-center">
      <div className="wood-board" style={{ width: 'min(690px, 95vw)' }}>
        <div className="paper-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>第 {summary.round} ラウンド結果</h2>
            <span className="sketch-pill" style={{ padding: '4px 12px', fontSize: 13, fontWeight: 800 }}>
              目標: {target} pt 🚩
            </span>
          </div>

          {summary.outcome === 'too_easy' && (
            <div
              style={{
                background: '#FFF3BF',
                border: '2.5px solid #231F20',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 12,
                fontWeight: 800,
                textAlign: 'center',
                fontSize: 16,
                transform: 'rotate(-0.8deg)',
              }}
            >
              TOO EASY! 全員ゴールしてしまったため、今回は 0 点！
            </div>
          )}

          {summary.outcome === 'no_points' && (
            <div
              style={{
                background: '#FFE3E6',
                border: '2.5px solid #231F20',
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 12,
                fontWeight: 800,
                textAlign: 'center',
                fontSize: 16,
                transform: 'rotate(0.8deg)',
              }}
            >
              NO POINTS! 誰もゴールできなかったため、今回は 0 点！
            </div>
          )}

          <div style={{ display: 'grid', gap: 9 }}>
            {sorted.map((entry) => {
              const meta = CHARACTERS.find((c) => c.id === entry.character) ?? CHARACTERS[0];
              const pct = Math.min(100, (entry.newTotal / target) * 100);
              const badges: string[] = [];
              if (entry.goal > 0) badges.push(`ゴール +${entry.goal}`);
              if (entry.postMortem > 0) badges.push(`死後ゴール +${entry.postMortem}`);
              if (entry.first > 0) badges.push(`1位 +${entry.first}`);
              if (entry.solo > 0) badges.push(`ソロ +${entry.solo}`);
              if (entry.trap > 0) badges.push(`罠キル +${entry.trap}`);
              if (entry.coin > 0) badges.push(`コイン +${entry.coin}`);
              if (entry.comeback > 0) badges.push(`逆転 +${entry.comeback}`);

              return (
                <div
                  key={entry.playerId}
                  style={{
                    background: '#FFF',
                    border: '2.5px solid #231F20',
                    borderRadius: 12,
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                      <CharacterPortrait character={entry.character} size={30} dancing={entry.totalAdded > 0} />
                      <span>{entry.name}</span>
                      {entry.totalAdded > 0 && (
                        <span
                          style={{
                            color: '#FFF',
                            background: '#2BB673',
                            border: '1.5px solid #231F20',
                            borderRadius: 999,
                            padding: '1px 7px',
                            fontSize: 12,
                          }}
                        >
                          +{entry.totalAdded.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{entry.newTotal.toFixed(1)} pt</div>
                  </div>

                  {/* Progress track with flag goal */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 14,
                        borderRadius: 999,
                        border: '2px solid #231F20',
                        background: '#EFEAE2',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: meta.badgeColor,
                          transition: 'width 0.55s cubic-bezier(0.22, 1.15, 0.36, 1)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 14 }}>🏁</span>
                  </div>

                  {badges.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                      {badges.map((b) => (
                        <span
                          key={b}
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            background: '#FFF3BF',
                            border: '1.5px solid #231F20',
                            borderRadius: 6,
                            padding: '1px 6px',
                          }}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#5C5552' }}>
              {Math.ceil(snapshot.phaseTimer)}秒後に自動で次へ進みます
            </span>
            {isHost && (
              <button type="button" className="btn btn-primary" onClick={onNext}>
                次のラウンドへ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
