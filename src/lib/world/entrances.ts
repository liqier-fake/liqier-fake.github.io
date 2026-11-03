import type { SceneName } from '../content/navigation';
import type { WorldFrame } from './timeline';

export type EntranceState = 'distant' | 'near' | 'focused' | 'entering';

export interface EntranceDefinition {
  id: string;
  label: string;
  href: string;
  scene: SceneName | 'central-platform';
}

export interface EntranceControllerOptions {
  onFocus?(entrance: EntranceDefinition): void;
  onConfirm?(entrance: EntranceDefinition): void;
  onCancel?(): void;
}

export class EntranceController {
  private readonly definitions = new Map<string, EntranceDefinition>();
  private readonly states = new Map<string, EntranceState>();
  private readonly options: EntranceControllerOptions;
  private focusedId: string | null = null;

  constructor(entrances: EntranceDefinition[], options: EntranceControllerOptions = {}) {
    this.options = options;
    entrances.forEach((entrance) => {
      this.definitions.set(entrance.id, entrance);
      this.states.set(entrance.id, 'distant');
    });
  }

  update(frame: WorldFrame): void {
    const isNear = frame.phase === 'approach';
    this.definitions.forEach((_, id) => {
      if (id !== this.focusedId) this.states.set(id, isNear ? 'near' : 'distant');
    });
    if (!isNear && this.focusedId) this.cancel();
  }

  focus(id: string): boolean {
    const entrance = this.definitions.get(id);
    if (!entrance || this.states.get(id) !== 'near') return false;
    if (this.focusedId && this.focusedId !== id) this.states.set(this.focusedId, 'near');
    this.focusedId = id;
    this.states.set(id, 'focused');
    this.options.onFocus?.(entrance);
    return true;
  }

  confirm(id: string): boolean {
    const entrance = this.definitions.get(id);
    if (!entrance || this.focusedId !== id || this.states.get(id) !== 'focused') return false;
    this.states.set(id, 'entering');
    this.options.onConfirm?.(entrance);
    return true;
  }

  cancel(): void {
    if (this.focusedId) this.states.set(this.focusedId, 'near');
    this.focusedId = null;
    this.options.onCancel?.();
  }

  getState(id: string): EntranceState {
    return this.states.get(id) ?? 'distant';
  }
}

export function mountEntranceLayer(root: HTMLElement): () => void {
  const nodes = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-world-entrance]'));
  const definitions: EntranceDefinition[] = nodes.map((node) => ({
    id: node.dataset.entranceId ?? '',
    label: node.textContent?.trim() ?? '',
    href: node.href,
    scene: (node.dataset.entranceScene ?? 'central-platform') as EntranceDefinition['scene'],
  }));

  const render = (): void => {
    nodes.forEach((node) => {
      const state = controller.getState(node.dataset.entranceId ?? '');
      node.dataset.entranceState = state;
      node.tabIndex = state === 'distant' ? -1 : 0;
      node.setAttribute('aria-hidden', state === 'distant' ? 'true' : 'false');
    });
  };

  const emit = (name: string, entrance?: EntranceDefinition): void => {
    window.dispatchEvent(new CustomEvent(name, { detail: entrance }));
  };

  const controller = new EntranceController(definitions, {
    onFocus: (entrance) => emit('world:focus', entrance),
    onConfirm: (entrance) => emit('world:confirm', entrance),
    onCancel: () => emit('world:cancel'),
  });

  const sync = (): void => {
    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = scrollY / range;
    const phase = progress >= 0.72 ? 'approach' : progress >= 0.42 ? 'hub' : progress >= 0.28 ? 'gate' : 'arrival';
    controller.update({ phase, cameraT: progress, fogDensity: 0, worldLight: 1, dragonMode: 'idle', focusedEntranceId: null });
    render();
  };

  const onClick = (event: Event): void => {
    const node = event.currentTarget as HTMLAnchorElement;
    const id = node.dataset.entranceId ?? '';
    event.preventDefault();
    if (controller.getState(id) !== 'focused') {
      controller.focus(id);
      render();
      node.focus();
    } else if (controller.confirm(id)) {
      sessionStorage.setItem('liqier:hub-scroll', String(scrollY));
      window.location.assign(node.href);
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const node = event.currentTarget as HTMLAnchorElement;
    const id = node.dataset.entranceId ?? '';
    if ((event.key === 'Enter' || event.key === ' ') && controller.getState(id) === 'focused') {
      event.preventDefault();
      if (controller.confirm(id)) {
        sessionStorage.setItem('liqier:hub-scroll', String(scrollY));
        window.location.assign(node.href);
      }
    }
  };

  const onEscape = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    controller.cancel();
    render();
  };

  // Pin each label to its object in the world once the renderer reports where it is on screen.
  const onAnchors = (event: Event): void => {
    const anchors = (event as CustomEvent<Record<string, { x: number; y: number; visible: boolean }>>).detail;
    const pad = 56;
    nodes.forEach((node) => {
      const anchor = anchors[node.dataset.entranceId ?? ''];
      if (!anchor?.visible) {
        delete node.dataset.anchored;
        node.style.removeProperty('left');
        node.style.removeProperty('top');
        delete node.dataset.ax;
        delete node.dataset.ay;
        return;
      }
      node.dataset.anchored = '';
      const x = Math.round(Math.min(innerWidth - pad, Math.max(pad, anchor.x)));
      const y = Math.round(Math.min(innerHeight - pad, Math.max(pad + 24, anchor.y)));
      // deadband: ignore sub-3px breathing so labels stay put (and stay easy to click)
      const lastX = Number(node.dataset.ax ?? NaN);
      const lastY = Number(node.dataset.ay ?? NaN);
      if (Math.abs(x - lastX) < 3 && Math.abs(y - lastY) < 3) return;
      node.dataset.ax = String(x);
      node.dataset.ay = String(y);
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
    });
  };
  window.addEventListener('world:anchors', onAnchors);

  nodes.forEach((node) => {
    node.addEventListener('click', onClick);
    node.addEventListener('keydown', onKeyDown);
  });
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('keydown', onEscape);
  sync();

  return () => {
    nodes.forEach((node) => {
      node.removeEventListener('click', onClick);
      node.removeEventListener('keydown', onKeyDown);
    });
    window.removeEventListener('scroll', sync);
    window.removeEventListener('keydown', onEscape);
    window.removeEventListener('world:anchors', onAnchors);
  };
}
