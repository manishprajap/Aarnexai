import { describe, expect, it } from 'vitest';
import { resolveBusinessCategory } from './businessCategory';

describe('resolveBusinessCategory', () => {
  it('uses the authenticated user category when no local cache exists', () => {
    const user = {
      id: 42,
      categoryId: 8,
      category: 'Fashion',
    } as any;

    expect(resolveBusinessCategory(user, null)).toEqual({
      categoryId: 8,
      categoryName: 'Fashion',
    });
  });
});
