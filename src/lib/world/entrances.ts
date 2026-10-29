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
      node.dataset.entranceState = controller.getState(node.dataset.entranceId ?? '');
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
    if (controller.getState(id) !== 'focused') {
      event.preventDefault();
      controller.focus(id);
      render();
      node.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const node = event.currentTarget as HTMLAnchorElement;
    const id = node.dataset.entranceId ?? '';
    if ((event.key === 'Enter' || event.key === ' ') && controller.getState(id) === 'focused') {
      event.preventDefault();
      if (controller.confirm(id)) window.location.assign(node.href);
    }
  };

  const onEscape = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    controller.cancel();
    render();
  };

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
  };
}
