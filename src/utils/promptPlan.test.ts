import { describe, expect, it } from 'vitest';
import { normalizePromptPlanResponse } from './promptPlan';

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
});
