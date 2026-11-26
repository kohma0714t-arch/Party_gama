import { InputState } from './types';

export class InputManager {
  private keys = new Set<string>();
  private onRotateCb: (() => void) | null = null;
  private onFlipCb: (() => void) | null = null;
  private onAnyInteractionCb: (() => void) | null = null;

  constructor(handlers?: {
    onRotate?: () => void;
    onFlip?: () => void;
    onAnyInteraction?: () => void;
  }) {
    this.onRotateCb = handlers?.onRotate ?? null;
    this.onFlipCb = handlers?.onFlip ?? null;
    this.onAnyInteractionCb = handlers?.onAnyInteraction ?? null;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.onAnyInteractionCb?.();
    if (this.isTypingInInput(e.target)) return;

    const code = e.code;
    if (!this.keys.has(code)) {
      if (code === 'KeyR') this.onRotateCb?.();
      if (code === 'KeyF') this.onFlipCb?.();
    }
    this.keys.add(code);

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.keys.clear();
  };

  public getInputState(): InputState {
    let left = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    let right = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    let up = this.keys.has('ArrowUp') || this.keys.has('KeyW');
    let down = this.keys.has('ArrowDown') || this.keys.has('KeyS');
    let jump = this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW');
    let sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    let dance = this.keys.has('KeyE') || this.keys.has('KeyQ');

    // Merge connected gamepad 0 if available
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[0];
    if (pad) {
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      if (ax < -0.35 || pad.buttons[14]?.pressed) left = true;
      if (ax > 0.35 || pad.buttons[15]?.pressed) right = true;
      if (ay < -0.45 || pad.buttons[12]?.pressed) up = true;
      if (ay > 0.45 || pad.buttons[13]?.pressed) down = true;
      if (pad.buttons[0]?.pressed) jump = true;
      if (pad.buttons[2]?.pressed || pad.buttons[7]?.pressed) sprint = true;
      if (pad.buttons[3]?.pressed || pad.buttons[1]?.pressed) dance = true;
    }

    return { left, right, up, down, jump, sprint, dance };
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
