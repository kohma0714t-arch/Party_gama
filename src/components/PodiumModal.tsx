import React from 'react';
import { GameSnapshot } from '../game/types';
import { CharacterPortrait } from './LivePreviews';

interface PodiumModalProps {
  snapshot: GameSnapshot;
  isHost: boolean;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  snapshot,
  isHost,
  onPlayAgain,
  onReturnLobby,
}) => {
  const ranked = [...snapshot.players].sort((a, b) => b.score - a.score);
  const top3 = ranked.slice(0, 3);

  return (
    <div className="modal-center">
      <div className="wood-board" style={{ width: 'min(650px, 95vw)' }}>
        <div className="paper-panel" style={{ textAlign: 'center' }}>
          <div className="garland-strip" />
          <h2 style={{ margin: '0 0 6px', fontSize: 28 }}>ゲーム決着！表彰台</h2>
          <p style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#5C5552' }}>
            優勝は <strong style={{ color: '#2D7FF9' }}>{ranked[0]?.name}</strong>（{ranked[0]?.score.toFixed(1)} pt）！
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 14, marginBottom: 20 }}>
            {top3.map((p, idx) => {
              const heights = [126, 90, 66];
              const colors = ['#FFB703', '#D8DEE9', '#DDA15E'];
              const order = idx === 0 ? 1 : idx === 1 ? 0 : 2;
              return (
                <div
                  key={p.id}
                  style={{ order, width: 138, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  {idx === 0 && <div style={{ fontSize: 22, marginBottom: -4 }}>👑</div>}
                  <CharacterPortrait character={p.character} size={62} dancing={idx === 0} />
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                  <div
                    style={{
                      width: '100%',
                      height: heights[idx],
                      background: colors[idx],
                      border: '2.5px solid #231F20',
                      borderRadius: '10px 10px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      fontWeight: 800,
                    }}
                  >
                    <div style={{ fontSize: 20 }}>{idx + 1}位</div>
                    <div style={{ fontSize: 13 }}>{p.score.toFixed(1)} pt</div>
                  </div>
                </div>
              );
            })}
          </div>

          {ranked.length > 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {ranked.slice(3).map((p, i) => (
                <span key={p.id} className="sketch-pill" style={{ padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>
                  {i + 4}位: {p.name} ({p.score.toFixed(1)} pt)
                </span>
              ))}
            </div>
          )}

          {isHost ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
                同じ設定でもう1戦！
              </button>
              <button type="button" className="btn" onClick={onReturnLobby}>
                ツリーハウスに戻る
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 800, color: '#5C5552' }}>
              ホストの選択を待っています...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
