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

export type TransportMode = 'webrtc' | 'local';

export type NetMessage =
  | { type: 'JOIN'; name: string; preferredChar?: CharacterId }
  | { type: 'WELCOME'; playerId: string; roomCode: string; snapshot: GameSnapshot }
  | { type: 'REJECT'; reason: string }
  | { type: 'LOBBY_UPDATE'; character?: CharacterId; stageSelection?: StageSelection; rules?: Partial<GameRules> }
  | { type: 'INPUT'; input: InputState }
  | { type: 'CURSOR'; cursor: CursorState }
  | { type: 'PICK'; boxIndex: number }
  | { type: 'PLACE'; gx: number; gy: number; rot: 0 | 1 | 2 | 3; flipX: boolean }
  | {
      type: 'FREEPLAY_ACTION';
      action: 'select' | 'remove' | 'clear' | 'toggle_test';
      itemId?: ItemId;
      gx?: number;
      gy?: number;
    }
  | { type: 'SNAPSHOT'; snapshot: GameSnapshot }
  | { type: 'EVENT'; events: SimEvent[] };

export interface TransportCallbacks {
  onMessage: (fromPeerId: string, msg: NetMessage) => void;
  onPeerJoin?: (peerId: string) => void;
  onPeerLeave?: (peerId: string) => void;
  onDisconnected?: (reason: string) => void;
}

export interface INetTransport {
  readonly mode: TransportMode;
  readonly isHost: boolean;
  host(roomCode: string, callbacks: TransportCallbacks): Promise<void>;
  join(roomCode: string, callbacks: TransportCallbacks): Promise<void>;
  sendToHost(msg: NetMessage): void;
  sendToPeer(peerId: string, msg: NetMessage): void;
  broadcast(msg: NetMessage): void;
  destroy(): void;
}
