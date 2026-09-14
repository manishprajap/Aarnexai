// Device ID generate/persist karta hai aur device type detect karta hai

const DEVICE_ID_KEY = 'device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      (crypto?.randomUUID?.() as string) ||
      `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export type DeviceType = 'desktop' | 'laptop' | 'tablet' | 'android' | 'ios' | 'other';

export function getDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipod/.test(ua)) return 'ios';
  if (/ipad/.test(ua)) return 'tablet'; // iPad ko tablet treat karna hai
  if (/android/.test(ua)) {
    return /mobile/.test(ua) ? 'android' : 'tablet'; // android tablet vs phone
  }
  if (/tablet|kindle|playbook|silk/.test(ua)) return 'tablet';

  // Windows/Mac/Linux desktop ya laptop — UA se differentiate mushkil hai,
  // isliye touch + screen size ka heuristic use kar rahe hain
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch && window.innerWidth < 1024) return 'tablet';

  if (/macintosh|windows|linux/.test(ua)) return 'desktop';

  return 'other';
}

export function getDeviceName(): string {
  return navigator.userAgent.slice(0, 191);
}