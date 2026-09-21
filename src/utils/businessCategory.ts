// src/utils/businessCategory.ts
//
// Business Setup saves the MAIN business category here (e.g. "Fashion").
// The Upload page reads it back and only asks for the subcategory / child
// category per product.
//
// localStorage is only a CACHE. The real source of truth should be your backend
// (business/setup + /auth/me), because localStorage can be cleared by the OS,
// by "clear app data", or on a new device.

export interface BusinessCategory {
  categoryId: number;
  categoryName: string | null;
}

const keyFor = (userId: string | number) => `businessCategory:${userId}`;

export const saveBusinessCategory = (
  userId: string | number | null | undefined,
  value: BusinessCategory,
): void => {
  if (userId === null || userId === undefined || userId === '') {
    return;
  }

  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(value));
  } catch (error) {
    console.warn('Could not save business category', error);
  }
};

export const getBusinessCategory = (
  userId: string | number | null | undefined,
): BusinessCategory | null => {
  if (userId === null || userId === undefined || userId === '') {
    return null;
  }

  try {
    const raw = localStorage.getItem(keyFor(userId));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as BusinessCategory;

    return parsed && parsed.categoryId ? parsed : null;
  } catch {
    return null;
  }
};

export const clearBusinessCategory = (userId: string | number | null | undefined): void => {
  if (userId === null || userId === undefined || userId === '') {
    return;
  }

  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
};

export const resolveBusinessCategory = (
  user: { id?: number | string | null; categoryId?: number | string | null; category?: string | null } | null | undefined,
  cached: BusinessCategory | null,
): BusinessCategory | null => {
  const userCategoryId = user && user.categoryId !== undefined && user.categoryId !== null
    ? Number(user.categoryId)
    : null;

  if (userCategoryId && Number.isFinite(userCategoryId)) {
    return {
      categoryId: userCategoryId,
      categoryName: user?.category ?? cached?.categoryName ?? null,
    };
  }

  return cached;
};