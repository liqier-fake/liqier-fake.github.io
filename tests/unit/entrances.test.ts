import { describe, expect, it, vi } from 'vitest';
import { EntranceController, type EntranceDefinition } from '../../src/lib/world/entrances';
import { sampleWorldFrame } from '../../src/lib/world/timeline';

const entrances: EntranceDefinition[] = [
  { id: 'essay-pavilion:after-the-long-night', label: '长夜之后', href: '/articles/after-the-long-night/', scene: 'essay-pavilion' },
  { id: 'paper-slip:first-light', label: '初光', href: '/thoughts/first-light/', scene: 'paper-slip' },
];

describe('environmental entrance state machine', () => {
  it('never confirms from proximity changes alone', () => {
    const onConfirm = vi.fn();
    const controller = new EntranceController(entrances, { onConfirm });
    controller.update(sampleWorldFrame(0.76, false));
    controller.update(sampleWorldFrame(0.93, false));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms only a focused near entrance', () => {
    const onConfirm = vi.fn();
    const controller = new EntranceController(entrances, { onConfirm });
    controller.update({ ...sampleWorldFrame(0.8, false), focusedEntranceId: entrances[0].id });
    expect(controller.confirm(entrances[0].id)).toBe(false);
    expect(controller.focus(entrances[0].id)).toBe(true);
    expect(controller.confirm(entrances[1].id)).toBe(false);
    expect(controller.confirm(entrances[0].id)).toBe(true);
    expect(onConfirm).toHaveBeenCalledWith(entrances[0]);
  });

  it('cancels focus without entering', () => {
    const controller = new EntranceController(entrances);
    controller.update({ ...sampleWorldFrame(0.8, false), focusedEntranceId: entrances[0].id });
    controller.focus(entrances[0].id);
    controller.cancel();
    expect(controller.getState(entrances[0].id)).toBe('near');
  });
});
