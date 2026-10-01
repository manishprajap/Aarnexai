import { apiDelete, apiGet, apiPost, apiPut } from '../api';

export type ProductAvailability = 'in_stock' | 'out_of_stock' | 'preorder';

export interface WhatsAppCatalog {
  id: string | number;
  name: string;
  metaCatalogId?: string | null;
  businessCategoryId?: string | number | null;
  businessCategory?: string | null;
  status?: string | null;
}

export interface CatalogProduct {
  id: string | number;
  catalogId?: string | number | null;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  sku: string | null;
  availability: ProductAvailability;
  categoryId: string | number | null;
  categoryName?: string | null;
  businessCategoryId?: string | number | null;
  businessCategory?: string | null;
  metaProductId?: string | null;
  syncedAt?: string | null;
}

export interface CatalogCategory {
  id: string | number;
  name: string;
}

export interface ProductInput {
  catalogId: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  sku: string;
  availability: ProductAvailability;
  categoryId: string;
  businessCategoryId: string;
  businessCategory: string;
  image: File | null;
}

export interface WhatsAppConversation {
  id: string | number;
  customerName: string;
  phoneNumber: string;
  profileImageUrl?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  status?: string | null;
}

export interface WhatsAppMessage {
  id: string | number;
  conversationId: string | number;
  direction: 'incoming' | 'outgoing';
  type: 'text' | 'image' | 'video' | 'document' | 'product';
  text?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  productId?: string | number | null;
  createdAt: string;
}

const unwrapArray = <T,>(response: any, key: string): T[] => {
  const data = response?.data ?? response;
  const value = data?.[key] ?? data?.items ?? data?.results;
  return Array.isArray(value) ? value : [];
};

const productEndpoint = '/whatsapp/catalog/products';
const categoryEndpoint = '/whatsapp/catalog/categories';
const catalogEndpoint = '/whatsapp/catalog';
const categoryScopedEndpoint = (
  endpoint: string,
  catalogId?: string | number | null,
  businessCategoryId?: string | number | null,
  businessCategory?: string | null
) => {
  const query = new URLSearchParams();
  if (catalogId) query.set('catalogId', String(catalogId));
  if (businessCategoryId) query.set('businessCategoryId', String(businessCategoryId));
  if (businessCategory?.trim()) query.set('businessCategory', businessCategory.trim());
  if (!query.size) return endpoint;
  return `${endpoint}?${query.toString()}`;
};

const normalizeCatalog = (response: any): WhatsAppCatalog | null => {
  const data = response?.data ?? response;
  const raw = data?.catalog ?? data;
  const id = raw?.id ?? raw?.catalogId;
  if (id === undefined || id === null || id === '') return null;
  return {
    id,
    name: raw?.name ?? raw?.catalogName ?? 'WhatsApp Catalog',
    metaCatalogId: raw?.metaCatalogId ?? raw?.meta_catalog_id ?? null,
    businessCategoryId: raw?.businessCategoryId ?? null,
    businessCategory: raw?.businessCategory ?? null,
    status: raw?.status ?? null,
  };
};

export const getWhatsAppCatalog = async (): Promise<WhatsAppCatalog | null> => {
  const response = await apiGet(catalogEndpoint);
  return normalizeCatalog(response);
};

export const createWhatsAppCatalog = async (
  name: string,
  businessCategoryId?: string | number | null,
  businessCategory?: string | null
): Promise<WhatsAppCatalog | null> => {
  const response = await apiPost(catalogEndpoint, {
    name: name.trim(),
    ...(businessCategoryId ? { businessCategoryId } : {}),
    ...(businessCategory?.trim() ? { businessCategory: businessCategory.trim() } : {}),
  });
  if (response?.success === false) {
    throw new Error(response?.message || 'Could not create the WhatsApp catalog.');
  }
  return normalizeCatalog(response);
};

export const getCatalogProducts = async (
  catalogId?: string | number | null,
  businessCategoryId?: string | number | null,
  businessCategory?: string | null
): Promise<CatalogProduct[]> =>
  unwrapArray<CatalogProduct>(
    await apiGet(categoryScopedEndpoint(productEndpoint, catalogId, businessCategoryId, businessCategory)),
    'products'
  );

export const getCatalogCategories = async (
  catalogId?: string | number | null,
  businessCategoryId?: string | number | null,
  businessCategory?: string | null
): Promise<CatalogCategory[]> =>
  unwrapArray<CatalogCategory>(
    await apiGet(categoryScopedEndpoint(categoryEndpoint, catalogId, businessCategoryId, businessCategory)),
    'categories'
  );

const productForm = (input: ProductInput) => {
  const form = new FormData();
  form.set('catalogId', input.catalogId);
  form.set('name', input.name.trim());
  form.set('description', input.description.trim());
  form.set('price', input.price);
  form.set('currency', input.currency);
  form.set('sku', input.sku.trim());
  form.set('availability', input.availability);
  form.set('categoryId', input.categoryId);
  if (input.businessCategoryId) form.set('businessCategoryId', input.businessCategoryId);
  if (input.businessCategory.trim()) form.set('businessCategory', input.businessCategory.trim());
  if (input.image) form.set('image', input.image);
  return form;
};

export const createCatalogProduct = (input: ProductInput) =>
  apiPost(productEndpoint, productForm(input));

export const updateCatalogProduct = (id: string | number, input: ProductInput) =>
  apiPut(`${productEndpoint}/${encodeURIComponent(String(id))}`, productForm(input));

export const deleteCatalogProduct = (id: string | number) =>
  apiDelete(`${productEndpoint}/${encodeURIComponent(String(id))}`);

export const createCatalogCategory = (
  name: string,
  catalogId?: string | number | null,
  businessCategoryId?: string | number | null,
  businessCategory?: string | null
) => apiPost(categoryEndpoint, {
  name: name.trim(),
  ...(catalogId ? { catalogId } : {}),
  ...(businessCategoryId ? { businessCategoryId } : {}),
  ...(businessCategory?.trim() ? { businessCategory: businessCategory.trim() } : {}),
});

export const syncWhatsAppCatalog = (
  catalogId?: string | number | null,
  businessCategoryId?: string | number | null,
  businessCategory?: string | null
) => apiPost('/whatsapp/catalog/sync', {
  ...(catalogId ? { catalogId } : {}),
  ...(businessCategoryId ? { businessCategoryId } : {}),
  ...(businessCategory?.trim() ? { businessCategory: businessCategory.trim() } : {}),
});

export const getWhatsAppConversations = async (): Promise<WhatsAppConversation[]> =>
  unwrapArray<WhatsAppConversation>(
    await apiGet('/whatsapp/inbox/conversations'),
    'conversations'
  );

export const getWhatsAppMessages = async (
  conversationId: string | number
): Promise<WhatsAppMessage[]> =>
  unwrapArray<WhatsAppMessage>(
    await apiGet(`/whatsapp/inbox/conversations/${encodeURIComponent(String(conversationId))}/messages`),
    'messages'
  );

export const sendWhatsAppMessage = (
  conversationId: string | number,
  text: string,
  attachment: File | null,
  productId?: string | number
) => {
  const form = new FormData();
  if (text.trim()) form.set('text', text.trim());
  if (attachment) form.set('file', attachment);
  if (productId !== undefined) form.set('productId', String(productId));

  return apiPost(
    `/whatsapp/inbox/conversations/${encodeURIComponent(String(conversationId))}/messages`,
    form
  );
};
