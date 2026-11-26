import { DT, MAX_PLAYERS, ROOM_CODE_CHARS } from '../game/constants';
import { GameSimulation } from '../game/simulation';
import {
  CharacterId,
  CursorState,
  GameRules,
  GameSnapshot,
  InputState,
  ItemId,
  SimEvent,
  StageSelection,
} from '../game/types';
import { LocalNetTransport } from './localTransport';
import { PeerNetTransport } from './peerTransport';
import { INetTransport, NetMessage, TransportMode } from './transport';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export interface RoomListener {
  onSnapshot: (snapshot: GameSnapshot) => void;
  onEvents: (events: SimEvent[]) => void;
  onError: (msg: string) => void;
  onDisconnected: (reason: string) => void;
}

export class RoomManager {
  public roomCode = '';
  public localPlayerId = 'host_player';
  public isHost = true;
  public transportMode: TransportMode = 'webrtc';

  private sim: GameSimulation | null = null;
  private transport: INetTransport | null = null;
  private peerToPlayerId = new Map<string, string>();

  // Client interpolation state
  private clientSnapshot: GameSnapshot | null = null;
  private targetSnapshot: GameSnapshot | null = null;

  private rafId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private snapshotBroadcastAccum = 0;
  private inputSendAccum = 0;
  private localInput: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    sprint: false,
    dance: false,
  };
  private listener: RoomListener;

  constructor(listener: RoomListener) {
    this.listener = listener;
  }

  public startHost(options: {
    playerName: string;
    mode: TransportMode;
  }): Promise<string> {
    this.cleanup();
    this.isHost = true;
    this.transportMode = options.mode;
    this.roomCode = generateRoomCode();
    this.localPlayerId = 'host_player';

    const sim = new GameSimulation();
    this.sim = sim;
    sim.addPlayer(this.localPlayerId, options.playerName, true);

    const startLoop = () => {
      this.startLoop();
      this.listener.onSnapshot(sim.getSnapshot());
    };

    const transport: INetTransport =
      options.mode === 'webrtc' ? new PeerNetTransport() : new LocalNetTransport();
    this.transport = transport;

    return transport
      .host(this.roomCode, {
        onMessage: (peerId, msg) => this.handleHostMessage(peerId, msg),
        onPeerLeave: (peerId) => {
          const pid = this.peerToPlayerId.get(peerId);
          if (pid && this.sim) {
            this.sim.removePlayer(pid);
            this.peerToPlayerId.delete(peerId);
            this.broadcastSnapshot();
          }
        },
      })
      .then(() => {
        startLoop();
        return this.roomCode;
      })
      .catch((err) => {
        // Fallback to local solo-host notice if WebRTC signaling fails
        this.cleanup();
        throw err;
      });
  }

  public joinRoom(options: {
    roomCode: string;
    playerName: string;
    mode: TransportMode;
  }): Promise<void> {
    this.cleanup();
    this.isHost = false;
    this.transportMode = options.mode;
    this.roomCode = options.roomCode.toUpperCase().trim();

    const transport: INetTransport =
      options.mode === 'webrtc' ? new PeerNetTransport() : new LocalNetTransport();
    this.transport = transport;

    return new Promise((resolve, reject) => {
      let welcomed = false;
      const welcomeTimeout = window.setTimeout(() => {
        if (!welcomed) {
          this.cleanup();
          reject(new Error('ルームからの応答がありませんでした'));
        }
      }, 8000);

      transport
        .join(this.roomCode, {
          onMessage: (_from, msg) => {
            if (msg.type === 'WELCOME') {
              welcomed = true;
              window.clearTimeout(welcomeTimeout);
              this.localPlayerId = msg.playerId;
              this.clientSnapshot = msg.snapshot;
              this.targetSnapshot = msg.snapshot;
              this.startLoop();
              this.listener.onSnapshot(msg.snapshot);
              resolve();
            } else if (msg.type === 'REJECT') {
              welcomed = true;
              window.clearTimeout(welcomeTimeout);
              this.cleanup();
              reject(new Error(msg.reason));
            } else if (msg.type === 'SNAPSHOT') {
              this.targetSnapshot = msg.snapshot;
              if (!this.clientSnapshot) {
                this.clientSnapshot = msg.snapshot;
              }
            } else if (msg.type === 'EVENT') {
              this.listener.onEvents(msg.events);
            }
          },
          onDisconnected: (reason) => {
            this.cleanup();
            this.listener.onDisconnected(reason);
          },
        })
        .then(() => {
          transport.sendToHost({
            type: 'JOIN',
            name: options.playerName,
          });
        })
        .catch((err) => {
          window.clearTimeout(welcomeTimeout);
          this.cleanup();
          reject(err);
        });
    });
  }

  private handleHostMessage(peerId: string, msg: NetMessage): void {
    const sim = this.sim;
    if (!sim) return;

    if (msg.type === 'JOIN') {
      if (sim.players.length >= MAX_PLAYERS) {
        this.transport?.sendToPeer(peerId, {
          type: 'REJECT',
          reason: 'ルームが満員（最大6人）です',
        });
        return;
      }
      if (sim.phase !== 'LOBBY') {
        this.transport?.sendToPeer(peerId, {
          type: 'REJECT',
          reason: '現在試合が進行中のため参加できません',
        });
        return;
      }
      const playerId = `guest_${peerId.slice(-8)}_${Math.random().toString(36).slice(2, 5)}`;
      const added = sim.addPlayer(playerId, msg.name, false, msg.preferredChar);
      if (!added) {
        this.transport?.sendToPeer(peerId, {
          type: 'REJECT',
          reason: 'ルームに参加できませんでした',
        });
        return;
      }
      this.peerToPlayerId.set(peerId, added.id);
      const snap = sim.getSnapshot();
      this.transport?.sendToPeer(peerId, {
        type: 'WELCOME',
        playerId: added.id,
        roomCode: this.roomCode,
        snapshot: snap,
      });
      this.broadcastSnapshot();
      return;
    }

    const playerId = this.peerToPlayerId.get(peerId);
    if (!playerId) return;

    switch (msg.type) {
      case 'INPUT':
        sim.setInput(playerId, msg.input);
        break;
      case 'CURSOR':
        sim.updateCursor(playerId, msg.cursor);
        break;
      case 'PICK':
        sim.pickBoxItem(playerId, msg.boxIndex);
        this.broadcastSnapshot();
        break;
      case 'PLACE':
        if (sim.placeBlock(playerId, msg.gx, msg.gy, msg.rot, msg.flipX)) {
          this.broadcastSnapshot();
        }
        break;
      case 'LOBBY_UPDATE':
        if (msg.character) {
          sim.setCharacter(playerId, msg.character);
          this.broadcastSnapshot();
        }
        break;
    }
  }

  // --- Player actions (unified for host & guest) ---
  public setLocalInput(input: InputState): void {
    this.localInput = input;
    if (this.isHost) {
      this.sim?.setInput(this.localPlayerId, input);
    }
  }

  public setLocalCursor(cursor: CursorState): void {
    if (this.isHost) {
      this.sim?.updateCursor(this.localPlayerId, cursor);
    } else {
      this.transport?.sendToHost({ type: 'CURSOR', cursor });
    }
  }

  public pickBoxItem(boxIndex: number): void {
    if (this.isHost) {
      if (this.sim?.pickBoxItem(this.localPlayerId, boxIndex)) {
        this.broadcastSnapshot();
      }
    } else {
      this.transport?.sendToHost({ type: 'PICK', boxIndex });
    }
  }

  public placeBlock(gx: number, gy: number, rot: 0 | 1 | 2 | 3, flipX: boolean): void {
    if (this.isHost) {
      if (this.sim?.placeBlock(this.localPlayerId, gx, gy, rot, flipX)) {
        this.broadcastSnapshot();
      }
    } else {
      this.transport?.sendToHost({ type: 'PLACE', gx, gy, rot, flipX });
    }
  }

  public selectCharacter(character: CharacterId): void {
    if (this.isHost) {
      this.sim?.setCharacter(this.localPlayerId, character);
      this.broadcastSnapshot();
    } else {
      this.transport?.sendToHost({ type: 'LOBBY_UPDATE', character });
    }
  }

  // --- Host-only controls ---
  public setStage(selection: StageSelection): void {
    if (!this.isHost || !this.sim) return;
    this.sim.setStage(selection);
    this.broadcastSnapshot();
  }

  public setRules(rules: Partial<GameRules>): void {
    if (!this.isHost || !this.sim) return;
    this.sim.setRules(rules);
    this.broadcastSnapshot();
  }

  public startGame(): void {
    if (!this.isHost || !this.sim) return;
    this.sim.startGame();
    this.broadcastSnapshot();
  }

  public returnToLobby(): void {
    if (!this.isHost || !this.sim) return;
    this.sim.returnToLobby();
    this.broadcastSnapshot();
  }

  public skipScoreScreen(): void {
    if (!this.isHost || !this.sim || this.sim.phase !== 'SCORE') return;
    this.sim.advanceAfterScore();
    this.broadcastSnapshot();
  }

  public toggleFreeplayTest(): void {
    if (!this.isHost || !this.sim) return;
    this.sim.toggleFreeplayTest();
    this.broadcastSnapshot();
  }

  public freeplaySelectItem(itemId: ItemId): void {
    if (!this.isHost || !this.sim) return;
    this.sim.freeplaySelectItem(this.localPlayerId, itemId);
    this.broadcastSnapshot();
  }

  public freeplayRemoveAt(gx: number, gy: number): void {
    if (!this.isHost || !this.sim) return;
    if (this.sim.freeplayRemoveAt(gx, gy)) {
      this.broadcastSnapshot();
    }
  }

  public freeplayClear(): void {
    if (!this.isHost || !this.sim) return;
    this.sim.freeplayClearBlocks();
    this.broadcastSnapshot();
  }

  public getCurrentSnapshot(): GameSnapshot | null {
    if (this.isHost) {
      return this.sim ? this.sim.getSnapshot() : null;
    }
    return this.clientSnapshot;
  }

  public canPlacePreview(itemId: ItemId, gx: number, gy: number, rot: 0 | 1 | 2 | 3): boolean {
    if (this.sim) {
      return this.sim.canPlaceBlock(itemId, gx, gy, rot).ok;
    }
    return true;
  }

  private broadcastSnapshot(): void {
    if (!this.sim) return;
    const snap = this.sim.getSnapshot();
    this.listener.onSnapshot(snap);
    this.transport?.broadcast({ type: 'SNAPSHOT', snapshot: snap });
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tickFn = (now: number) => {
      const elapsed = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.isHost && this.sim) {
        this.accumulator += elapsed;
        const allEvents: SimEvent[] = [];
        while (this.accumulator >= DT) {
          const evs = this.sim.step(DT);
          if (evs.length > 0) allEvents.push(...evs);
          this.accumulator -= DT;
        }
        if (allEvents.length > 0) {
          this.listener.onEvents(allEvents);
          this.transport?.broadcast({ type: 'EVENT', events: allEvents });
        }
        this.snapshotBroadcastAccum += elapsed;
        if (this.snapshotBroadcastAccum >= 0.04) {
          // 25Hz broadcast
          this.snapshotBroadcastAccum = 0;
          this.broadcastSnapshot();
        } else {
          // Still update local React UI smoothly on phase/timer change
          this.listener.onSnapshot(this.sim.getSnapshot());
        }
      } else if (!this.isHost && this.targetSnapshot) {
        this.inputSendAccum += elapsed;
        if (this.inputSendAccum >= 0.033) {
          this.inputSendAccum = 0;
          this.transport?.sendToHost({ type: 'INPUT', input: this.localInput });
        }
        this.interpolateClientSnapshot(elapsed);
        if (this.clientSnapshot) {
          this.listener.onSnapshot(this.clientSnapshot);
        }
      }

      this.rafId = window.requestAnimationFrame(tickFn);
    };
    this.rafId = window.requestAnimationFrame(tickFn);
  }

  private interpolateClientSnapshot(dt: number): void {
    const target = this.targetSnapshot;
    if (!target) return;
    if (!this.clientSnapshot || this.clientSnapshot.phase !== target.phase) {
      this.clientSnapshot = target;
      return;
    }

    const alpha = Math.min(1, dt * 18);
    const cur = this.clientSnapshot;
    cur.phaseTimer = target.phaseTimer;
    cur.phaseDuration = target.phaseDuration;
    cur.round = target.round;
    cur.stageId = target.stageId;
    cur.stageSelection = target.stageSelection;
    cur.rules = target.rules;
    cur.partyBox = target.partyBox;
    cur.lastSummary = target.lastSummary;
    cur.winnerIds = target.winnerIds;
    cur.lavaY += (target.lavaY - cur.lavaY) * alpha;
    cur.blocks = target.blocks;
    cur.projectiles = target.projectiles;
    cur.windmillBlades = target.windmillBlades;
    cur.freeplayTesting = target.freeplayTesting;

    // Interpolate player positions
    cur.players = target.players.map((tp) => {
      const prev = cur.players.find((cp) => cp.id === tp.id);
      if (!prev) return { ...tp };
      const dist = Math.hypot(tp.x - prev.x, tp.y - prev.y);
      if (dist > 140) return { ...tp };
      return {
        ...tp,
        x: prev.x + (tp.x - prev.x) * alpha,
        y: prev.y + (tp.y - prev.y) * alpha,
      };
    });
  }

  public cleanup(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.transport?.destroy();
    this.transport = null;
    this.sim = null;
    this.peerToPlayerId.clear();
    this.clientSnapshot = null;
    this.targetSnapshot = null;
  }
}
