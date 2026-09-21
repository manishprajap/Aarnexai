export interface PromptPlanItem {
  day: number;
  prompt: string;
}

const PLAN_KEY = 'aarnexai:prompt-plan';

const ANGLES = [
  'Introduce the product with a clear hero message and one memorable benefit.',
  'Show a close-up detail and explain why it makes the product feel premium.',
  'Create a problem-and-solution concept for a customer who needs this product.',
  'Highlight the most practical everyday use with a simple visual story.',
  'Create a trust-building post focused on quality, finish and reliability.',
  'Present the product as a thoughtful gift with warm, welcoming copy.',
  'Use a bold comparison angle that explains what makes this product different.',
  'Create a limited-time offer concept with a strong but honest call to action.',
  'Show three reasons a customer should consider this product today.',
  'Create a behind-the-scenes concept about the care and craft behind the product.',
  'Write a concise FAQ-style prompt answering the most likely buyer question.',
  'Create a lifestyle scene showing the product naturally in its ideal setting.',
  'Focus on the product texture, color or finish with elegant visual direction.',
  'Create a customer testimonial-style concept without inventing specific claims.',
  'Build a seasonal concept that feels relevant, fresh and locally relatable.',
  'Create a beginner-friendly guide explaining how to choose or use this product.',
  'Use a minimal premium layout with one benefit, one proof point and one CTA.',
  'Create a social-proof concept using general customer satisfaction language.',
  'Show a common mistake and explain how this product helps avoid it.',
  'Create a product-versus-alternative concept without naming competitors.',
  'Use an educational tip related to the category and naturally feature the product.',
  'Create an emotional brand story around confidence, comfort or convenience.',
  'Design a scroll-stopping question-led post that invites customer responses.',
  'Create a local-business spotlight concept with a friendly community tone.',
  'Use a clean catalog-style composition focused on essential product information.',
  'Create a before-and-after concept without making unsupported transformation claims.',
  'Build a bundle or repeat-purchase concept with clear value communication.',
  'Create a short reel storyboard with three scenes and a final product CTA.',
  'Create a weekend-ready or occasion-ready concept tailored to the product use.',
  'Close the month with a best-of recap highlighting the strongest product benefits.',
];

const getKey = (userId: string | number) => `${PLAN_KEY}:${userId}`;

export const getPlanDay = (date = new Date()): number => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const day = Math.floor((date.getTime() - start) / 86400000) + 1;
  return ((day - 1) % 30) + 1;
};

export const generatePromptPlan = (
  category: string,
  subcategory = '',
  childCategory = '',
): PromptPlanItem[] => {
  const hierarchy = [category, subcategory, childCategory].filter(Boolean).join(' > ');

  return ANGLES.map((angle, index) => ({
    day: index + 1,
    prompt: `Create a professional marketing post for ${hierarchy}. ${angle} Use the product photo, keep the message specific to ${hierarchy}, and include a natural call to action.`,
  }));
};

export const savePromptPlan = (userId: string | number, plan: PromptPlanItem[]) => {
  localStorage.setItem(getKey(userId), JSON.stringify(plan));
};

export const getPromptPlan = (userId: string | number): PromptPlanItem[] => {
  try {
    const value = JSON.parse(localStorage.getItem(getKey(userId)) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
