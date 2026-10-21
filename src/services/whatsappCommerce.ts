import { apiDelete, apiGet, apiPost, apiPut } from '../api';

export type ProductAvailability = 'in_stock' | 'out_of_stock' | 'preorder';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppConnection {
  connected: boolean;
  phoneNumber?: string | null;
  displayName?: string | null;
  qualityRating?: string | null;
  status?: string | null;
}

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

export interface WhatsAppMessageTemplate {
  id: string | number;
  name: string;
  displayName: string;
  language: string;
  status: string;
  bodyText: string;
  parameterCount: number;
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
  status?: MessageStatus;
  errorMessage?: string | null;
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

/* -------------------------------------------------------------------------- */
/* Connection                                                                 */
/* -------------------------------------------------------------------------- */

export const getWhatsAppConnection = async (): Promise<WhatsAppConnection> => {
  const response = await apiGet('/whatsapp/status');
  const data = response?.data ?? response;
  // Backend shape: { success, connected, profile: { phoneNumber, businessName, ... } }
  const raw = data?.profile ?? data?.connection ?? data?.account ?? data;
  const status = typeof raw?.status === 'string' ? raw.status.toLowerCase() : null;
  return {
    connected: Boolean(
      data?.connected ?? raw?.connected ?? raw?.linked ?? ['connected', 'active', 'linked'].includes(status ?? '')
    ),
    phoneNumber:
      raw?.phoneNumber ?? raw?.displayPhoneNumber ?? raw?.display_phone_number ??
      raw?.phone_number ?? raw?.whatsappNumber ?? raw?.number ?? null,
    displayName:
      raw?.displayName ?? raw?.verifiedName ?? raw?.verified_name ??
      raw?.businessName ?? raw?.name ?? null,
    qualityRating: raw?.qualityRating ?? raw?.quality_rating ?? null,
    status,
  };
};

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Inbox / messaging                                                          */
/* -------------------------------------------------------------------------- */

const withPlus = (phone: unknown) => {
  const value = String(phone ?? '').trim();
  return value && /^\d+$/.test(value) ? `+${value}` : value;
};

// Backend row  ->  UI shape
const normalizeConversation = (raw: any): WhatsAppConversation => {
  const contact = raw?.contact ?? {};
  const phone = withPlus(contact.phoneNumber ?? contact.waId ?? raw?.phoneNumber);
  return {
    id: raw?.id,
    customerName: contact.name || contact.profileName || raw?.customerName || phone,
    phoneNumber: phone,
    profileImageUrl: contact.avatarUrl ?? raw?.profileImageUrl ?? null,
    lastMessage: raw?.lastMessageText ?? raw?.lastMessage ?? null,
    lastMessageAt: raw?.lastMessageAt ?? null,
    unreadCount: Number(raw?.unreadCount || 0),
    status: raw?.status ?? null,
  };
};

const MESSAGE_TYPES: WhatsAppMessage['type'][] = ['text', 'image', 'video', 'document', 'product'];
const MESSAGE_STATUSES: MessageStatus[] = ['sending', 'sent', 'delivered', 'read', 'failed'];

const normalizeMessage = (raw: any): WhatsAppMessage => {
  const metadata = raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {};
  const type: WhatsAppMessage['type'] = MESSAGE_TYPES.includes(raw?.type) ? raw.type : 'text';
  const status = raw?.status === 'pending' ? 'sending' : raw?.status;
  const fileName = raw?.fileName ?? metadata.fileName ?? null;
  const text =
    raw?.text ||
    (fileName ? `📎 ${fileName}` : type !== 'text' ? `[${raw?.type || type}]` : null);

  return {
    id: raw?.id,
    conversationId: raw?.conversationId,
    direction: ['outbound', 'outgoing'].includes(raw?.direction) ? 'outgoing' : 'incoming',
    type,
    text,
    mediaUrl: raw?.mediaUrl ?? metadata.mediaUrl ?? null,
    fileName,
    productId: raw?.productId ?? null,
    status: MESSAGE_STATUSES.includes(status) ? status : undefined,
    errorMessage: raw?.errorMessage ?? null,
    createdAt: raw?.createdAt,
  };
};

export const getWhatsAppConversations = async (): Promise<WhatsAppConversation[]> =>
  unwrapArray<any>(await apiGet('/whatsapp/inbox/conversations'), 'conversations').map(
    normalizeConversation
  );

export const getWhatsAppMessages = async (
  conversationId: string | number
): Promise<WhatsAppMessage[]> =>
  unwrapArray<any>(
    await apiGet(`/whatsapp/inbox/conversations/${encodeURIComponent(String(conversationId))}/messages`),
    'messages'
  ).map(normalizeMessage);

/** Approved Meta WhatsApp message templates available to the connected business. */
export const getWhatsAppMessageTemplates = async (): Promise<WhatsAppMessageTemplate[]> => {
  const response = await apiGet('/whatsapp/templates');
  if (response?.success === false) {
    throw new Error(response?.message || 'Could not load WhatsApp message templates.');
  }
  const data = response?.data ?? response;
  console.log('WhatsApp templates response:', data);
  const rows = data?.templates ?? data?.items ?? data?.results;
  if (!Array.isArray(rows)) return [];
  return rows.map((raw: any) => ({
    id: raw.id ?? raw.name,
    name: String(raw.name ?? ''),
    displayName: String(raw.displayName ?? raw.display_name ?? raw.name ?? 'Message template'),
    language: String(raw.language ?? raw.languageCode ?? raw.language_code ?? 'en'),
    status: String(raw.status ?? 'UNKNOWN').toUpperCase(),
    bodyText: String(raw.bodyText ?? raw.body_text ?? raw.body ?? ''),
    parameterCount: Number(raw.parameterCount ?? raw.parameter_count ?? (String(raw.bodyText ?? raw.body_text ?? raw.body ?? '').match(/\{\{\s*\d+\s*\}\}/g) ?? []).length),
  }));
};

/** Send an approved template to the selected conversation. */
export const sendWhatsAppMessageTemplate = async (
  conversationId: string | number,
  templateId: string | number,
  parameters: string[] = [],
) => {
  const response = await apiPost(
    `/whatsapp/inbox/conversations/${encodeURIComponent(String(conversationId))}/template`,
    { templateId, parameters },
  );
  if (response?.success === false) {
    throw new Error(response?.message || 'WhatsApp template could not be sent.');
  }
  return response;
};

export const sendWhatsAppMessage = async (
  conversationId: string | number,
  text: string,
  attachment: File | null,
  productId?: string | number
) => {
  const form = new FormData();
  if (text.trim()) form.set('text', text.trim());
  if (attachment) form.set('file', attachment);
  if (productId !== undefined) form.set('productId', String(productId));

  const response = await apiPost(
    `/whatsapp/inbox/conversations/${encodeURIComponent(String(conversationId))}/messages`,
    form
  );
  if (response?.success === false) {
    throw new Error(response?.message || 'Message could not be sent.');
  }
  return response;
};

/**
 * Start a brand-new conversation with a phone number (country code included,
 * digits only, e.g. 919876543210) and send the first text message.
 */
export const startWhatsAppConversation = async (
  phoneNumber: string,
  text: string
): Promise<WhatsAppConversation | null> => {
  const response = await apiPost('/whatsapp/inbox/conversations', {
    phoneNumber,
    text: text.trim(),
  });
  if (response?.success === false) {
    throw new Error(response?.message || 'Could not start the conversation.');
  }
  const data = response?.data ?? response;
  const raw = data?.conversation ?? data;
  return raw?.id !== undefined && raw?.id !== null ? normalizeConversation(raw) : null;
};


/**
 * Checks WhatsApp Cloud API registration status.
 * The backend must return success only when Meta confirms
 * that the phone number is registered for messaging.
 */
export const activateWhatsAppNumber = async () => {
  const response = await apiPost('/whatsapp/register', {});

  const data = response?.data ?? response;

  if (
    response?.success === false ||
    data?.success === false ||
    data?.registered === false
  ) {
    throw new Error(
      data?.message ||
        response?.message ||
        'WhatsApp number is not registered with Meta. Complete registration in WhatsApp Manager.'
    );
  }

  return data;
};

/**
 * Subscribes this WhatsApp Business Account to the app's webhook.
 * Without this, Meta never sends incoming messages or delivered/read updates.
 */
export const subscribeWhatsAppWebhook = async () => {
  const response = await apiPost('/whatsapp/subscribe', {});
  const data = response?.data ?? response;
  if (response?.success === false || data?.success === false) {
    throw new Error(data?.message || response?.message || 'Could not subscribe the webhook.');
  }
  return data;
};