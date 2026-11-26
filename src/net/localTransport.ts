import { INetTransport, NetMessage, TransportCallbacks } from './transport';

interface LocalEnvelope {
  senderId: string;
  targetId: string; // 'host' | 'all' | peerId
  kind: 'MSG' | 'HELLO' | 'BYE';
  payload?: NetMessage;
}

export class LocalNetTransport implements INetTransport {
  public readonly mode = 'local' as const;
  public isHost = false;

  private channel: BroadcastChannel | null = null;
  private selfId = `local_${Math.random().toString(36).slice(2, 9)}`;
  private callbacks: TransportCallbacks | null = null;
  private knownPeers = new Set<string>();
  private beforeUnloadHandler: (() => void) | null = null;

  public host(roomCode: string, callbacks: TransportCallbacks): Promise<void> {
    this.isHost = true;
    this.callbacks = callbacks;
    this.channel = new BroadcastChannel(`tc-party-local-${roomCode}`);

    this.channel.onmessage = (ev: MessageEvent<LocalEnvelope>) => {
      const env = ev.data;
      if (!env || env.senderId === this.selfId) return;
      if (env.targetId !== 'host' && env.targetId !== 'all') return;

      if (env.kind === 'HELLO') {
        if (!this.knownPeers.has(env.senderId)) {
          this.knownPeers.add(env.senderId);
          this.callbacks?.onPeerJoin?.(env.senderId);
        }
      } else if (env.kind === 'BYE') {
        if (this.knownPeers.has(env.senderId)) {
          this.knownPeers.delete(env.senderId);
          this.callbacks?.onPeerLeave?.(env.senderId);
        }
      } else if (env.kind === 'MSG' && env.payload) {
        if (!this.knownPeers.has(env.senderId)) {
          this.knownPeers.add(env.senderId);
          this.callbacks?.onPeerJoin?.(env.senderId);
        }
        this.callbacks?.onMessage(env.senderId, env.payload);
      }
    };

    return Promise.resolve();
  }

  public join(roomCode: string, callbacks: TransportCallbacks): Promise<void> {
    this.isHost = false;
    this.callbacks = callbacks;
    this.channel = new BroadcastChannel(`tc-party-local-${roomCode}`);

    return new Promise((resolve, reject) => {
      let resolved = false;
      const timer = window.setTimeout(() => {
        if (!resolved) {
          reject(new Error('同一ブラウザ内でホストのルームが見つかりませんでした。先に別タブでルームを作成してください。'));
        }
      }, 2500);

      this.channel!.onmessage = (ev: MessageEvent<LocalEnvelope>) => {
        const env = ev.data;
        if (!env || env.senderId === this.selfId) return;
        if (env.targetId !== 'all' && env.targetId !== this.selfId) return;

        if (env.kind === 'BYE' && env.senderId === 'host') {
          this.callbacks?.onDisconnected?.('ホストがルームを終了しました');
          return;
        }
        if (env.kind === 'MSG' && env.payload) {
          if (!resolved) {
            resolved = true;
            window.clearTimeout(timer);
            resolve();
          }
          this.callbacks?.onMessage('host', env.payload);
        }
      };

      this.beforeUnloadHandler = () => {
        this.channel?.postMessage({
          senderId: this.selfId,
          targetId: 'host',
          kind: 'BYE',
        } satisfies LocalEnvelope);
      };
      window.addEventListener('beforeunload', this.beforeUnloadHandler);

      // Announce presence and resolve immediately so JOIN can be sent
      this.channel!.postMessage({
        senderId: this.selfId,
        targetId: 'host',
        kind: 'HELLO',
      } satisfies LocalEnvelope);
      resolved = true;
      window.clearTimeout(timer);
      resolve();
    });
  }

  public sendToHost(msg: NetMessage): void {
    this.channel?.postMessage({
      senderId: this.selfId,
      targetId: 'host',
      kind: 'MSG',
      payload: msg,
    } satisfies LocalEnvelope);
  }

  public sendToPeer(peerId: string, msg: NetMessage): void {
    this.channel?.postMessage({
      senderId: 'host',
      targetId: peerId,
      kind: 'MSG',
      payload: msg,
    } satisfies LocalEnvelope);
  }

  public broadcast(msg: NetMessage): void {
    this.channel?.postMessage({
      senderId: 'host',
      targetId: 'all',
      kind: 'MSG',
      payload: msg,
    } satisfies LocalEnvelope);
  }

  public destroy(): void {
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    if (this.channel) {
      this.channel.postMessage({
        senderId: this.selfId,
        targetId: this.isHost ? 'all' : 'host',
        kind: 'BYE',
      } satisfies LocalEnvelope);
      this.channel.close();
      this.channel = null;
    }
    this.knownPeers.clear();
  }
}
