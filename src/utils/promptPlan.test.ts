import { describe, expect, it } from 'vitest';
import {
  getCurrentPromptPlanItem,
  getPromptPlanRegenerationState,
  normalizePromptPlanResponse,
} from './promptPlan';

describe('getCurrentPromptPlanItem', () => {
  it('returns the item matching the current calendar date in the plan', () => {
    const items = [
      { day: 1, prompt: 'First day' },
      { day: 2, prompt: 'Second day' },
    ];

    expect(getCurrentPromptPlanItem(items, '2026-10-12', '2026-10-13')).toEqual(items[1]);
  });

  it('returns null when today is outside the saved plan', () => {
    expect(getCurrentPromptPlanItem([{ day: 1, prompt: 'First day' }], '2026-10-12', '2026-11-12')).toBeNull();
  });
});

describe('normalizePromptPlanResponse', () => {
  it('reads nested database responses and sorts prompts by day', () => {
    const result = normalizePromptPlanResponse({
      data: {
        plan: { startDate: '2026-09-30T00:00:00.000Z' },
        today: { day: 1, prompt: 'Today prompt' },
        items: [
          { day: '2', theme: 'Second', prompt: 'Prompt two' },
          { day: 1, theme: 'First', prompt: 'Prompt one' },
          { day: 3, prompt: null },
        ],
      },
    });

    expect(result).toEqual({
      items: [
        { day: 1, theme: 'First', prompt: 'Prompt one' },
        { day: 2, theme: 'Second', prompt: 'Prompt two' },
      ],
      today: { day: 1, prompt: 'Today prompt' },
      startDate: '2026-09-30T00:00:00.000Z',
    });
  });

  describe('getPromptPlanRegenerationState', () => {
    const now = Date.parse('2026-10-07T00:00:00.000Z');

    it('locks regeneration while the saved 30-day plan is active', () => {
      expect(getPromptPlanRegenerationState('2026-09-08', 30, now)).toEqual({
        locked: true,
        nextAvailableAt: Date.parse('2026-10-08T00:00:00.000Z'),
        daysUntilUnlock: 1,
      });
    });

    it('unlocks regeneration after 30 days and allows first-time generation', () => {
      expect(getPromptPlanRegenerationState('2026-09-07', 30, now).locked).toBe(false);
      expect(getPromptPlanRegenerationState(null, 0, now)).toEqual({
        locked: false,
        nextAvailableAt: null,
        daysUntilUnlock: 0,
      });
    });
  });
});
