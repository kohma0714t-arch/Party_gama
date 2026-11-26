import Peer, { DataConnection } from 'peerjs';
import { INetTransport, NetMessage, TransportCallbacks } from './transport';

const PEER_PREFIX = 'tc-party-';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class PeerNetTransport implements INetTransport {
  public readonly mode = 'webrtc' as const;
  public isHost = false;

  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private hostConn: DataConnection | null = null;
  private callbacks: TransportCallbacks | null = null;
  private destroyed = false;

  public host(roomCode: string, callbacks: TransportCallbacks): Promise<void> {
    this.isHost = true;
    this.callbacks = callbacks;

    return new Promise((resolve, reject) => {
      const peer = new Peer(`${PEER_PREFIX}${roomCode}`, {
        config: ICE_CONFIG,
      });
      this.peer = peer;

      const timer = window.setTimeout(() => {
        reject(new Error('P2Pルームの作成がタイムアウトしました。ローカルテストモードもお試しください。'));
      }, 10000);

      peer.on('open', () => {
        window.clearTimeout(timer);
        resolve();
      });

      peer.on('connection', (conn) => {
        const peerId = conn.peer;
        conn.on('open', () => {
          if (this.destroyed) {
            conn.close();
            return;
          }
          this.connections.set(peerId, conn);
          this.callbacks?.onPeerJoin?.(peerId);
        });
        conn.on('data', (data) => {
          this.callbacks?.onMessage(peerId, data as NetMessage);
        });
        conn.on('close', () => {
          this.connections.delete(peerId);
          this.callbacks?.onPeerLeave?.(peerId);
        });
        conn.on('error', () => {
          this.connections.delete(peerId);
          this.callbacks?.onPeerLeave?.(peerId);
        });
      });

      peer.on('error', (err) => {
        window.clearTimeout(timer);
        const msg =
          err.type === 'unavailable-id'
            ? '同じルームコードが既に使用されています。別のコードで再試行してください。'
            : `通信エラーが発生しました (${err.type})`;
        reject(new Error(msg));
      });
    });
  }

  public join(roomCode: string, callbacks: TransportCallbacks): Promise<void> {
    this.isHost = false;
    this.callbacks = callbacks;

    return new Promise((resolve, reject) => {
      const peer = new Peer({
        config: ICE_CONFIG,
      });
      this.peer = peer;

      const timer = window.setTimeout(() => {
        reject(new Error('ホストへの接続がタイムアウトしました。ルームコードを確認してください。'));
      }, 10000);

      peer.on('open', () => {
        const conn = peer.connect(`${PEER_PREFIX}${roomCode}`, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          window.clearTimeout(timer);
          resolve();
        });
        conn.on('data', (data) => {
          this.callbacks?.onMessage('host', data as NetMessage);
        });
        conn.on('close', () => {
          if (!this.destroyed) {
            this.callbacks?.onDisconnected?.('ホストとの接続が切断されました');
          }
        });
        conn.on('error', () => {
          window.clearTimeout(timer);
          reject(new Error('ホストとの接続に失敗しました'));
        });
      });

      peer.on('error', (err) => {
        window.clearTimeout(timer);
        const msg =
          err.type === 'peer-unavailable'
            ? '指定されたルームコードが見つかりませんでした。'
            : `接続エラーが発生しました (${err.type})`;
        reject(new Error(msg));
      });
    });
  }

  public sendToHost(msg: NetMessage): void {
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(msg);
    }
  }

  public sendToPeer(peerId: string, msg: NetMessage): void {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(msg);
    }
  }

  public broadcast(msg: NetMessage): void {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  public destroy(): void {
    this.destroyed = true;
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    this.hostConn?.close();
    this.hostConn = null;
    this.peer?.destroy();
    this.peer = null;
  }
}
