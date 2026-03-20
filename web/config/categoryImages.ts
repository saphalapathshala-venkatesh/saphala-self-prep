/**
 * Static image map for exam categories.
 * Keyed by Category.id from the database.
 * Category table has no imageUrl column — images are served from /public/images/categories/.
 */
export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  cmmruwqhz000395x32wjb9s2w: "/images/categories/ap-police.png", // AP Police
  cmmruwcuh000095x3ad4aah4g: "/images/categories/appsc.png", // APPSC
  cmmrux7lm000995x3btm3vww2: "/images/categories/tg-police.png", // TG Police
  cmmruwy7d000695x3ryhxpb0k: "/images/categories/tgpsc.png", // TGPSC
  cmmruxg8n000c95x3y8typk5h: "/images/categories/upsc.png", // UPSC
};

export function getCategoryImage(categoryId: string): string | null {
  return CATEGORY_IMAGE_MAP[categoryId] ?? null;
}
