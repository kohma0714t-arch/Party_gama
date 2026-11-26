import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { LobbyOverlay } from './components/LobbyOverlay';
import { PartyBoxModal } from './components/PartyBoxModal';
import { PodiumModal } from './components/PodiumModal';
import { ScoreboardModal } from './components/ScoreboardModal';
import { TitleScreen } from './components/TitleScreen';
import { DynamicAudioEngine } from './game/audio';
import { ITEM_MAP } from './game/catalog';
import { GRID_H, GRID_W, TILE, WORLD_H, WORLD_W } from './game/constants';
import { InputManager } from './game/input';
import { GameRenderer } from './game/renderer';
import { CursorState, GameSnapshot, SimEvent } from './game/types';
import { RoomManager } from './net/roomManager';
import { TransportMode } from './net/transport';

export function App() {
  const initialRoomCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') ?? '').toUpperCase().slice(0, 5);
  }, []);

  const [inRoom, setInRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [muted, setMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.45);
  const [sfxVolume, setSfxVolume] = useState(0.65);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localCursor, setLocalCursor] = useState<CursorState>({
    gx: Math.floor(GRID_W / 2),
    gy: Math.floor(GRID_H / 2),
    rot: 0,
    flipX: false,
    visible: true,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<DynamicAudioEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const roomRef = useRef<RoomManager | null>(null);
  const snapshotRef = useRef<GameSnapshot | null>(null);
  const cursorRef = useRef<CursorState>(localCursor);

  useEffect(() => {
    cursorRef.current = localCursor;
    roomRef.current?.setLocalCursor(localCursor);
  }, [localCursor]);

  useEffect(() => {
    const audio = new DynamicAudioEngine();
    const renderer = new GameRenderer();
    audioRef.current = audio;
    rendererRef.current = renderer;

    const room = new RoomManager({
      onSnapshot: (snap) => {
        snapshotRef.current = snap;
        setSnapshot(snap);
        audio.setPhase(snap.phase);
      },
      onEvents: (events: SimEvent[]) => {
        renderer.handleEvents(events);
        for (const ev of events) {
          if (ev.type === 'sfx' && ev.sfx) {
            audio.playSfx(ev.sfx);
          }
        }
      },
      onError: (msg) => setError(msg),
      onDisconnected: (reason) => {
        setInRoom(false);
        setSnapshot(null);
        snapshotRef.current = null;
        setError(reason);
      },
    });
    roomRef.current = room;

    const inputMgr = new InputManager({
      onAnyInteraction: () => audio.unlock(),
      onRotate: () => {
        setLocalCursor((prev) => ({
          ...prev,
          rot: ((prev.rot + 1) % 4) as 0 | 1 | 2 | 3,
        }));
      },
      onFlip: () => {
        setLocalCursor((prev) => ({
          ...prev,
          flipX: !prev.flipX,
        }));
      },
    });

    let rafId = 0;
    let lastDraw = performance.now();

    const drawLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastDraw) / 1000);
      lastDraw = now;

      room.setLocalInput(inputMgr.getInputState());

      const canvas = canvasRef.current;
      const snap = snapshotRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          if (snap) {
            const localPlayer = snap.players.find((p) => p.id === room.localPlayerId);
            const canPlace =
              localPlayer?.heldItemId
                ? room.canPlacePreview(
                    localPlayer.heldItemId,
                    cursorRef.current.gx,
                    cursorRef.current.gy,
                    cursorRef.current.rot
                  )
                : false;

            renderer.render(
              ctx,
              w,
              h,
              snap,
              room.localPlayerId,
              cursorRef.current,
              canPlace,
              dt
            );
          } else {
            renderer.renderTitleDiorama(ctx, w, h, dt);
          }
          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(drawLoop);
    };
    rafId = window.requestAnimationFrame(drawLoop);

    return () => {
      window.cancelAnimationFrame(rafId);
      inputMgr.destroy();
      room.cleanup();
      audio.destroy();
    };
  }, []);

  const screenToGrid = (clientX: number, clientY: number): { gx: number; gy: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / WORLD_W, rect.height / WORLD_H);
    const offsetX = (rect.width - WORLD_W * scale) / 2;
    const offsetY = (rect.height - WORLD_H * scale) / 2;
    const wx = (clientX - rect.left - offsetX) / scale;
    const wy = (clientY - rect.top - offsetY) / scale;
    const gx = Math.max(0, Math.min(GRID_W - 1, Math.floor(wx / TILE)));
    const gy = Math.max(0, Math.min(GRID_H - 1, Math.floor(wy / TILE)));
    return { gx, gy };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = screenToGrid(e.clientX, e.clientY);
    if (!pos) return;
    setLocalCursor((prev) =>
      prev.gx === pos.gx && prev.gy === pos.gy && prev.visible
        ? prev
        : { ...prev, gx: pos.gx, gy: pos.gy, visible: true }
    );
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    audioRef.current?.unlock();
    const snap = snapshotRef.current;
    const room = roomRef.current;
    if (!snap || !room) return;
    if (snap.phase !== 'PLACE' || snap.freeplayTesting) return;
    const pos = screenToGrid(e.clientX, e.clientY);
    if (!pos) return;

    if (e.button === 2) {
      if (snap.rules.mode === 'freeplay') {
        room.freeplayRemoveAt(pos.gx, pos.gy);
      }
      return;
    }

    const localPlayer = snap.players.find((p) => p.id === room.localPlayerId);
    const rot =
      localPlayer?.heldItemId && ITEM_MAP[localPlayer.heldItemId].rotatable
        ? cursorRef.current.rot
        : 0;
    room.placeBlock(pos.gx, pos.gy, rot, cursorRef.current.flipX);
  };

  const handleCreateRoom = async (name: string, mode: TransportMode) => {
    audioRef.current?.unlock();
    setLoading(true);
    setError(null);
    try {
      await roomRef.current?.startHost({ playerName: name, mode });
      setInRoom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (name: string, code: string, mode: TransportMode) => {
    audioRef.current?.unlock();
    setLoading(true);
    setError(null);
    try {
      await roomRef.current?.joinRoom({ roomCode: code, playerName: name, mode });
      setInRoom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルーム参加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    roomRef.current?.cleanup();
    setInRoom(false);
    setSnapshot(null);
    snapshotRef.current = null;
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen denial in restricted iframes
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioRef.current?.setMuted(next);
  };

  const handleChangeBgmVolume = (v: number) => {
    setBgmVolume(v);
    audioRef.current?.setBgmVolume(v);
  };

  const handleChangeSfxVolume = (v: number) => {
    setSfxVolume(v);
    audioRef.current?.setSfxVolume(v);
  };

  const room = roomRef.current;

  return (
    <div className="app-shell">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={handleCanvasMouseDown}
        onContextMenu={(e) => e.preventDefault()}
      />

      {!inRoom || !snapshot || !room ? (
        <TitleScreen
          initialRoomCode={initialRoomCode}
          loading={loading}
          error={error}
          isFullscreen={isFullscreen}
          muted={muted}
          bgmVolume={bgmVolume}
          sfxVolume={sfxVolume}
          onToggleFullscreen={toggleFullscreen}
          onToggleMute={toggleMute}
          onChangeBgmVolume={handleChangeBgmVolume}
          onChangeSfxVolume={handleChangeSfxVolume}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      ) : snapshot.phase === 'LOBBY' ? (
        <LobbyOverlay
          snapshot={snapshot}
          roomCode={room.roomCode}
          isHost={room.isHost}
          localPlayerId={room.localPlayerId}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onSelectCharacter={(c) => room.selectCharacter(c)}
          onSelectStage={(s) => room.setStage(s)}
          onUpdateRules={(r) => room.setRules(r)}
          onStartGame={() => room.startGame()}
          onLeave={handleLeave}
        />
      ) : (
        <>
          <GameHUD
            snapshot={snapshot}
            localPlayerId={room.localPlayerId}
            isHost={room.isHost}
            localCursor={localCursor}
            muted={muted}
            isFullscreen={isFullscreen}
            onToggleMute={toggleMute}
            onToggleFullscreen={toggleFullscreen}
            onRotate={() =>
              setLocalCursor((prev) => ({
                ...prev,
                rot: ((prev.rot + 1) % 4) as 0 | 1 | 2 | 3,
              }))
            }
            onFlip={() => setLocalCursor((prev) => ({ ...prev, flipX: !prev.flipX }))}
            onReturnLobby={() => room.returnToLobby()}
            onFreeplaySelect={(id) => room.freeplaySelectItem(id)}
            onFreeplayToggleTest={() => room.toggleFreeplayTest()}
            onFreeplayClear={() => room.freeplayClear()}
          />

          {snapshot.phase === 'BOX_PICK' && (
            <PartyBoxModal
              snapshot={snapshot}
              localPlayerId={room.localPlayerId}
              onPick={(idx) => room.pickBoxItem(idx)}
            />
          )}

          {snapshot.phase === 'SCORE' && (
            <ScoreboardModal
              snapshot={snapshot}
              isHost={room.isHost}
              onNext={() => room.skipScoreScreen()}
            />
          )}

          {snapshot.phase === 'PODIUM' && (
            <PodiumModal
              snapshot={snapshot}
              isHost={room.isHost}
              onPlayAgain={() => room.startGame()}
              onReturnLobby={() => room.returnToLobby()}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
