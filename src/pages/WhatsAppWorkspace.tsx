import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IonAlert,
  IonContent,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
  IonToast,
} from '@ionic/react';
import {
  addOutline,
  arrowBackOutline,
  attachOutline,
  barChartOutline,
  businessOutline,
  callOutline,
  chatbubbleEllipsesOutline,
  linkOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  cubeOutline,
  imageOutline,
  informationCircleOutline,
  logoWhatsapp,
  megaphoneOutline,
  pricetagOutline,
  refreshOutline,
  searchOutline,
  sendOutline,
  syncOutline,
  trashOutline,
} from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import {
  CatalogCategory,
  CatalogProduct,
  MessageStatus,
  ProductAvailability,
  ProductInput,
  WhatsAppCatalog,
  WhatsAppConnection,
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppMessageTemplate,
  createCatalogCategory,
  createCatalogProduct,
  activateWhatsAppNumber,
  createWhatsAppCatalog,
  deleteCatalogProduct,
  getCatalogCategories,
  getCatalogProducts,
  getWhatsAppCatalog,
  getWhatsAppConnection,
  getWhatsAppConversations,
  getWhatsAppMessages,
  getWhatsAppMessageTemplates,
  sendWhatsAppMessage,
  sendWhatsAppMessageTemplate,
  startWhatsAppConversation,
  subscribeWhatsAppWebhook,
  syncWhatsAppCatalog,
  updateCatalogProduct,
} from '../services/whatsappCommerce';
import CampaignsTab from '../components/whatsapp/CampaignsTab';
import AnalyticsTab from '../components/whatsapp/AnalyticsTab';
import './WhatsAppWorkspace.css';
import './WhatsAppWorkspace-template.css';
import './WhatsAppWorkspace-campaigns.css';

type WorkspaceTab = 'connection' | 'catalog' | 'inbox' | 'campaigns' | 'analytics';

// Route of your existing "connect WhatsApp" screen. Change if yours differs.
const CONNECT_ROUTE = '/whatsapp-connect';
// Route of your upgrade / pricing screen. Change if yours differs.
const UPGRADE_ROUTE = '/pricing';
type CatalogTab = 'products' | 'categories';

const POLL_INTERVAL_MS = 5000;

const VALID_VIEWS: WorkspaceTab[] = ['connection', 'inbox', 'campaigns', 'analytics'];

const emptyProduct = (catalogId = '', businessCategoryId = '', businessCategory = ''): ProductInput => ({
  catalogId,
  name: '',
  description: '',
  price: '',
  currency: 'INR',
  sku: '',
  availability: 'in_stock',
  categoryId: '',
  businessCategoryId,
  businessCategory,
  image: null,
});

const errorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Request failed. Please try again.';
};

const isTemplateMessage = (message: WhatsAppMessage) =>
  /^\s*\[template\]/i.test(message.text ?? '');

const isRecipientUnavailableError = (message: WhatsAppMessage) =>
  /\b131026\b/.test(message.errorMessage ?? '');

const formatTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const renderStatusTick = (status?: MessageStatus) => {
  switch (status) {
    case 'sending':
      return <span className="wa-tick" title="Sending">🕓</span>;
    case 'sent':
      return <span className="wa-tick" title="Sent">✓</span>;
    case 'delivered':
      return <span className="wa-tick" title="Delivered">✓✓</span>;
    case 'read':
      return <span className="wa-tick is-read" title="Read">✓✓</span>;
    case 'failed':
      return <span className="wa-tick is-failed" title="Failed">Failed</span>;
    default:
      return null;
  }
};

const getSuggestedCategories = (businessCategory: string) => {
  const category = businessCategory.toLowerCase();
  if (/doctor|physician|medical|health|clinic/.test(category)) {
    return ['Consultations', 'Diagnostics', 'Treatments', 'Wellness'];
  }
  if (/chartered|account|\bca\b/.test(category)) {
    return ['Tax and GST', 'Accounting', 'Audit', 'Business advisory'];
  }
  if (/lawyer|legal|advocate|\blaw\b/.test(category)) {
    return ['Legal consultation', 'Documentation', 'Litigation', 'Corporate law'];
  }
  return [];
};

const WhatsAppWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const profileCategoryId = user?.categoryId ? String(user.categoryId) : '';
  const profileCategoryName = user?.category?.trim() || '';
  // Plan flag: change the field name/value to match your user object.
  const isPaid = String((user as { plan?: string } | null)?.plan ?? '').toLowerCase() === 'pro';
  const viewParam = searchParams.get('view');
  const initialTab: WorkspaceTab = VALID_VIEWS.includes(viewParam as WorkspaceTab)
    ? (viewParam as WorkspaceTab)
    : 'catalog';
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('products');
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loadingConnection, setLoadingConnection] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatText, setNewChatText] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const [activating, setActivating] = useState(false);
  const [catalog, setCatalog] = useState<WhatsAppCatalog | null>(null);
  const [catalogName, setCatalogName] = useState('');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageTemplates, setMessageTemplates] = useState<WhatsAppMessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateParameters, setTemplateParameters] = useState<string[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sharedProductId, setSharedProductId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductInput>(emptyProduct);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogProduct | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [creatingCatalog, setCreatingCatalog] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pageError, setPageError] = useState('');
  const [toast, setToast] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef(false);

  /* ------------------------------------------------------------------ */
  /* Loaders                                                            */
  /* ------------------------------------------------------------------ */

  const loadConnection = async () => {
    setLoadingConnection(true);
    try {
      setConnection(await getWhatsAppConnection());
    } catch {
      setConnection(null);
    } finally {
      setLoadingConnection(false);
    }
  };

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    setPageError('');
    try {
      const currentCatalog = await getWhatsAppCatalog();
      setCatalog(currentCatalog);
      if (!currentCatalog) {
        setProducts([]);
        setCategories([]);
        return;
      }

      const [productsResult, categoriesResult] = await Promise.allSettled([
        getCatalogProducts(currentCatalog.id, profileCategoryId, profileCategoryName),
        getCatalogCategories(currentCatalog.id, profileCategoryId, profileCategoryName),
      ]);

      if (productsResult.status === 'fulfilled') setProducts(productsResult.value);
      else setPageError(errorText(productsResult.reason));

      // Categories failing should not hide products
      if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value);
      else setCategories([]);
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setLoadingCatalog(false);
    }
  };

  const loadConversations = async () => {
    setLoadingInbox(true);
    setPageError('');
    try {
      setConversations(await getWhatsAppConversations());
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setLoadingInbox(false);
    }
  };

  const loadMessageTemplates = async () => {
    setLoadingTemplates(true);
    try {
      setMessageTemplates(await getWhatsAppMessageTemplates());
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadMessages = async (conversation: WhatsAppConversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    setPageError('');
    try {
      setMessages(await getWhatsAppMessages(conversation.id));
      setConversations((current) => current.map((item) =>
        item.id === conversation.id ? { ...item, unreadCount: 0 } : item
      ));
    } catch (error) {
      setMessages([]);
      setPageError(errorText(error));
    } finally {
      setLoadingMessages(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Effects                                                            */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    void loadConnection();
    void loadCatalog();
    void loadConversations();
    void loadMessageTemplates();
  }, []);

  // Refresh connection card when the connect flow finishes
  useEffect(() => {
    const refresh = () => void loadConnection();
    window.addEventListener('whatsapp-linked', refresh);
    return () => window.removeEventListener('whatsapp-linked', refresh);
  }, []);

  useEffect(() => {
    if (!catalogName && profileCategoryName) {
      setCatalogName(`${profileCategoryName} Catalog`);
    }
  }, [catalogName, profileCategoryName]);

  useEffect(() => {
    if (activeTab === 'inbox' && selectedConversation) {
      messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight });
    }
  }, [activeTab, messages, selectedConversation]);

  // Near real-time updates: the webhook updates the DB, the app polls it.
  useEffect(() => {
    if (activeTab !== 'inbox') return undefined;

    const selectedId = selectedConversation?.id;

    const timer = window.setInterval(async () => {
      if (document.hidden || pollingRef.current) return;
      pollingRef.current = true;
      try {
        const latestConversations = await getWhatsAppConversations();
        setConversations(
          latestConversations.map((item) =>
            selectedId !== undefined && item.id === selectedId ? { ...item, unreadCount: 0 } : item
          )
        );
        if (selectedId !== undefined) {
          setMessages(await getWhatsAppMessages(selectedId));
        }
      } catch {
        // Silent: the next tick will retry.
      } finally {
        pollingRef.current = false;
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [activeTab, selectedConversation?.id]);

  /* ------------------------------------------------------------------ */
  /* Derived data                                                       */
  /* ------------------------------------------------------------------ */

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.categoryName].some((value) => value?.toLowerCase().includes(query))
    );
  }, [productSearch, products]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.customerName} ${conversation.phoneNumber} ${conversation.lastMessage ?? ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, search]);

  const suggestedCategories = useMemo(
    () => getSuggestedCategories(profileCategoryName),
    [profileCategoryName]
  );

  /* ------------------------------------------------------------------ */
  /* Handlers                                                           */
  /* ------------------------------------------------------------------ */

  const updateActiveTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'catalog') next.delete('view');
    else next.set('view', tab);
    setSearchParams(next, { replace: true });
    if (tab === 'inbox' && conversations.length === 0) void loadConversations();
  };

  const handleRefresh = () => {
    void loadConnection();
    // Campaigns and Analytics have their own refresh buttons.
    if (activeTab === 'connection' || activeTab === 'campaigns' || activeTab === 'analytics') return;
    if (activeTab === 'catalog') void loadCatalog();
    else {
      void loadConversations();
      if (selectedConversation) void loadMessages(selectedConversation);
    }
  };

  const openCreateProduct = () => {
    if (!catalog) return;
    setEditingProduct(null);
    setProductDraft(emptyProduct(String(catalog.id), profileCategoryId, profileCategoryName));
    setProductModalOpen(true);
  };

  const openEditProduct = (product: CatalogProduct) => {
    setEditingProduct(product);
    setProductDraft({
      name: product.name,
      catalogId: String(catalog?.id ?? product.catalogId ?? ''),
      description: product.description ?? '',
      price: String(product.price ?? ''),
      currency: product.currency || 'INR',
      sku: product.sku ?? '',
      availability: product.availability || 'in_stock',
      categoryId: product.categoryId === null ? '' : String(product.categoryId),
      businessCategoryId: profileCategoryId,
      businessCategory: profileCategoryName,
      image: null,
    });
    setProductModalOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productDraft.name.trim() || !Number.isFinite(Number(productDraft.price)) || Number(productDraft.price) < 0) {
      setPageError('Enter a product name and a valid price.');
      return;
    }
    if (!editingProduct && !productDraft.image) {
      setPageError('Choose a product image before saving.');
      return;
    }

    setSavingProduct(true);
    setPageError('');
    try {
      const productInput = {
        ...productDraft,
        catalogId: String(catalog?.id ?? ''),
        businessCategoryId: profileCategoryId,
        businessCategory: profileCategoryName,
      };
      if (editingProduct) await updateCatalogProduct(editingProduct.id, productInput);
      else await createCatalogProduct(productInput);
      setProductModalOpen(false);
      setToast(editingProduct ? 'Product updated.' : 'Product added to catalog.');
      await loadCatalog();
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCatalogProduct(deleteTarget.id);
      setProducts((current) => current.filter((item) => item.id !== deleteTarget.id));
      setToast('Product deleted.');
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryName.trim() || !catalog) return;
    try {
      await createCatalogCategory(categoryName, catalog.id, profileCategoryId, profileCategoryName);
      setCategoryName('');
      setToast('Category created.');
      await loadCatalog();
    } catch (error) {
      setPageError(errorText(error));
    }
  };

  const handleAddSuggestedCategory = async (name: string) => {
    if (!catalog) return;
    setCreatingCategory(name);
    setPageError('');
    try {
      await createCatalogCategory(name, catalog.id, profileCategoryId, profileCategoryName);
      setToast(`${name} category added for ${profileCategoryName}.`);
      await loadCatalog();
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setCreatingCategory(null);
    }
  };

  const handleSync = async () => {
    if (!catalog) return;
    setSyncing(true);
    setPageError('');
    try {
      const result = await syncWhatsAppCatalog(catalog.id, profileCategoryId, profileCategoryName);
      setToast(result?.message || 'Catalog sync completed with Meta.');
      await loadCatalog();
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateCatalog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catalogName.trim()) return;
    setCreatingCatalog(true);
    setPageError('');
    try {
      const created = await createWhatsAppCatalog(catalogName, profileCategoryId, profileCategoryName);
      if (!created) {
        throw new Error('Catalog was created but the server did not return its catalog ID.');
      }
      setCatalog(created);
      setToast('WhatsApp catalog created. You can now add products.');
      await loadCatalog();
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setCreatingCatalog(false);
    }
  };

  const selectedMessageTemplate = messageTemplates.find(
    (template) => String(template.id) === selectedTemplateId,
  );

  const handleSendTemplate = async () => {
    if (!selectedConversation || !selectedMessageTemplate) {
      setPageError('Select an approved message template first.');
      return;
    }
    if (selectedMessageTemplate.status !== 'APPROVED') {
      setPageError('Only Meta-approved templates can be sent.');
      return;
    }
    if (templateParameters.some((value) => !value.trim())) {
      setPageError('Please fill in all template parameters.');
      return;
    }
    if (connection && !connection.connected) {
      setPageError('WhatsApp is not connected. Connect your number before sending messages.');
      return;
    }

    setSendingTemplate(true);
    setPageError('');
    try {
      await sendWhatsAppMessageTemplate(
        selectedConversation.id,
        selectedMessageTemplate.id,
        templateParameters,
      );
      setSelectedTemplateId('');
      setTemplateParameters([]);
      setToast('WhatsApp template sent.');
      await Promise.all([loadMessages(selectedConversation), loadConversations()]);
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setSendingTemplate(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversation || (!messageText.trim() && !attachment && !sharedProductId)) return;
    if (connection && !connection.connected) {
      setPageError('WhatsApp is not connected. Connect your number before sending messages.');
      return;
    }

    const conversation = selectedConversation;
    const text = messageText;
    const file = attachment;
    const productId = sharedProductId || undefined;

    // Optimistic bubble so the message shows up instantly with a clock icon.
    const tempId = `temp-${Date.now()}`;
    const optimistic: WhatsAppMessage = {
      id: tempId,
      conversationId: conversation.id,
      direction: 'outgoing',
      type: file ? 'document' : productId ? 'product' : 'text',
      text: text.trim() || null,
      fileName: file?.name ?? null,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setMessageText('');
    setAttachment(null);
    setSharedProductId('');

    setSendingMessage(true);
    setPageError('');
    try {
      await sendWhatsAppMessage(conversation.id, text, file, productId);
      await Promise.all([loadMessages(conversation), loadConversations()]);
    } catch (error) {
      const message = errorText(error);
      setMessages((current) =>
        current.map((item) =>
          item.id === tempId ? { ...item, status: 'failed', errorMessage: message } : item
        )
      );
      setPageError(message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRetryMessage = async (failed: WhatsAppMessage) => {
    if (!selectedConversation || !failed.text) return;
    const conversation = selectedConversation;
    setMessages((current) =>
      current.map((item) =>
        item.id === failed.id ? { ...item, status: 'sending', errorMessage: null } : item
      )
    );
    setPageError('');
    try {
      await sendWhatsAppMessage(conversation.id, failed.text, null);
      await Promise.all([loadMessages(conversation), loadConversations()]);
    } catch (error) {
      const message = errorText(error);
      setMessages((current) =>
        current.map((item) =>
          item.id === failed.id ? { ...item, status: 'failed', errorMessage: message } : item
        )
      );
      setPageError(message);
    }
  };

  const handleStartConversation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let digits = newChatPhone.replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`; // default to India
    if (digits.length < 11 || digits.length > 15 || !newChatText.trim()) {
      setPageError('Enter a valid phone number with country code and a message.');
      return;
    }
    if (connection && !connection.connected) {
      setPageError('WhatsApp is not connected. Connect your number first.');
      return;
    }

    setStartingChat(true);
    setPageError('');
    try {
      const conversation = await startWhatsAppConversation(digits, newChatText);
      setNewChatOpen(false);
      setNewChatPhone('');
      setNewChatText('');
      updateActiveTab('inbox');
      await loadConversations();
      if (conversation) await loadMessages(conversation);
      setToast('Message sent.');
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setStartingChat(false);
    }
  };


  const handleActivate = async () => {
    setActivating(true);
    setPageError('');
    setToast('');

    try {
      const result = await activateWhatsAppNumber();

      // Make sure Meta delivers incoming messages + delivered/read ticks.
      try {
        await subscribeWhatsAppWebhook();
      } catch (subscribeError) {
        setPageError(errorText(subscribeError));
      }

      setToast(
        result?.message ||
        'Registration status checked successfully.'
      );

      await loadConnection();
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setActivating(false);
    }
  };


  const totalUnread = conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <IonPage className="wa-workspace-page">
      <IonContent fullscreen>
        <header className="wa-topbar">
          <button type="button" className="wa-icon-button" onClick={() => navigate(-1)} aria-label="Go back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <div className="wa-brand"><IonIcon icon={logoWhatsapp} /><span>WhatsApp Business</span></div>
          <button type="button" className="wa-icon-button" onClick={handleRefresh} aria-label="Refresh">
            <IonIcon icon={refreshOutline} />
          </button>
        </header>

        <main className="wa-workspace-content">
          {connection && activeTab !== 'connection' && (
            <div className={`wa-connection-card ${connection.connected ? 'is-connected' : 'is-disconnected'}`}>
              <IonIcon icon={connection.connected ? checkmarkCircleOutline : informationCircleOutline} />
              <div>
                <strong>
                  {connection.connected
                    ? connection.displayName || 'WhatsApp connected'
                    : 'WhatsApp not connected'}
                </strong>
                <small>
                  {connection.phoneNumber || (connection.connected
                    ? 'Number connected'
                    : 'Connect your number to start messaging')}
                </small>
              </div>
              {connection.connected && connection.qualityRating && (
                <span className="wa-quality">{connection.qualityRating.toLowerCase()}</span>
              )}
            </div>
          )}

          <nav className="wa-main-tabs" aria-label="WhatsApp workspace">
            <button type="button" className={activeTab === 'connection' ? 'is-active' : ''} onClick={() => updateActiveTab('connection')}>
              <IonIcon icon={linkOutline} /> Connection
            </button>
            <button type="button" className={activeTab === 'catalog' ? 'is-active' : ''} onClick={() => updateActiveTab('catalog')}>
              <IonIcon icon={cubeOutline} /> Catalog
            </button>
            <button type="button" className={activeTab === 'inbox' ? 'is-active' : ''} onClick={() => updateActiveTab('inbox')}>
              <IonIcon icon={logoWhatsapp} /> Inbox
              {totalUnread > 0 && <span className="wa-unread-badge">{totalUnread}</span>}
            </button>
            <button type="button" className={activeTab === 'campaigns' ? 'is-active' : ''} onClick={() => updateActiveTab('campaigns')}>
              <IonIcon icon={megaphoneOutline} /> Campaigns
            </button>
            <button type="button" className={activeTab === 'analytics' ? 'is-active' : ''} onClick={() => updateActiveTab('analytics')}>
              <IonIcon icon={barChartOutline} /> Analytics
            </button>
          </nav>

          {pageError && (
            <div className="wa-error" role="alert">
              <IonIcon icon={informationCircleOutline} />
              <span>{pageError}</span>
              <button type="button" onClick={() => setPageError('')} aria-label="Dismiss error"><IonIcon icon={closeOutline} /></button>
            </div>
          )}

          {activeTab === 'connection' ? (
            <section className="wa-section">
              <div className="wa-page-heading">
                <div>
                  <p className="wa-eyebrow">WHATSAPP NUMBER</p>
                  <h1>Connection</h1>
                  <p>Your connected business number and messaging shortcuts.</p>
                </div>
              </div>

              {loadingConnection && !connection ? (
                <div className="wa-loading"><IonSpinner /><span>Checking connection...</span></div>
              ) : connection?.connected ? (
                <div className="wa-connect-panel">
                  <div className="wa-connect-hero is-connected">
                    <span className="wa-connect-hero-icon"><IonIcon icon={checkmarkCircleOutline} /></span>
                    <div>
                      <strong>WhatsApp connected</strong>
                      <small>You can send and receive customer messages.</small>
                    </div>
                  </div>

                  <dl className="wa-connect-details">
                    <div><dt><IonIcon icon={businessOutline} /> Business name</dt><dd>{connection.displayName || '—'}</dd></div>
                    <div><dt><IonIcon icon={callOutline} /> Phone number</dt><dd>{connection.phoneNumber || '—'}</dd></div>
                    <div><dt><IonIcon icon={informationCircleOutline} /> Quality rating</dt><dd className="is-capitalize">{connection.qualityRating?.toLowerCase() || '—'}</dd></div>
                    <div><dt><IonIcon icon={linkOutline} /> Status</dt><dd className="is-capitalize">{connection.status || 'connected'}</dd></div>
                  </dl>

                  <div className="wa-connect-actions">
                    <button type="button" className="wa-primary-button" onClick={() => { updateActiveTab('inbox'); setNewChatOpen(true); }}>
                      <IonIcon icon={chatbubbleEllipsesOutline} /> New message
                    </button>
                    <button type="button" className="wa-secondary-button" onClick={() => updateActiveTab('inbox')}>
                      <IonIcon icon={logoWhatsapp} /> Open inbox
                    </button>
                    <button type="button" className="wa-secondary-button" onClick={() => void loadConnection()} disabled={loadingConnection}>
                      {loadingConnection ? <IonSpinner name="crescent" /> : <IonIcon icon={refreshOutline} />} Refresh status
                    </button>
                    <button type="button" className="wa-secondary-button" onClick={() => navigate(CONNECT_ROUTE)}>
                      <IonIcon icon={linkOutline} /> Reconnect number
                    </button>
                    <button type="button" className="wa-secondary-button" onClick={() => void handleActivate()} disabled={activating}>
                      {activating ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} />} Activate messaging
                    </button>
                  </div>
                </div>
              ) : (
                <section className="wa-catalog-setup">
                  <span className="wa-catalog-setup-icon"><IonIcon icon={logoWhatsapp} /></span>
                  <p className="wa-eyebrow">NOT CONNECTED</p>
                  <h2>Connect your WhatsApp number</h2>
                  <p className="wa-catalog-setup-copy">Connect your WhatsApp Business number to send and receive customer messages from this app.</p>
                  <button type="button" className="wa-primary-button" style={{ width: '100%', minHeight: 46 }} onClick={() => navigate(CONNECT_ROUTE)}>
                    <IonIcon icon={linkOutline} /> Connect WhatsApp
                  </button>
                </section>
              )}
            </section>
          ) : activeTab === 'catalog' ? (
            <section className="wa-section">
              <div className="wa-page-heading">
                <div><p className="wa-eyebrow">SELL ON WHATSAPP</p><h1>Catalog</h1><p>{profileCategoryName ? `Profile category: ${profileCategoryName}. Manage your products and services.` : 'Manage products and keep your WhatsApp catalog in sync.'}</p></div>
                {catalog && <button type="button" className="wa-primary-icon" onClick={openCreateProduct} aria-label="Add product" title="Add product"><IonIcon icon={addOutline} /></button>}
              </div>

              {loadingCatalog && !catalog ? (
                <div className="wa-loading"><IonSpinner /><span>Checking your WhatsApp catalog...</span></div>
              ) : !catalog ? (
                <section className="wa-catalog-setup">
                  <span className="wa-catalog-setup-icon"><IonIcon icon={cubeOutline} /></span>
                  <p className="wa-eyebrow">ONE-TIME SETUP</p>
                  <h2>Create your WhatsApp catalog</h2>
                  <p className="wa-catalog-setup-copy">A catalog is required before products can be added or synced with Meta.</p>
                  {profileCategoryName && <div className="wa-profile-category"><IonIcon icon={businessOutline} /><span>Linked to profile</span><strong>{profileCategoryName}</strong></div>}
                  <form onSubmit={(event) => void handleCreateCatalog(event)}>
                    <label htmlFor="wa-catalog-name">Catalog name</label>
                    <input id="wa-catalog-name" required maxLength={120} value={catalogName} onChange={(event) => setCatalogName(event.target.value)} placeholder="e.g. My Business Catalog" />
                    <button type="submit" className="wa-primary-button" disabled={creatingCatalog || !catalogName.trim()}>
                      {creatingCatalog ? <IonSpinner name="crescent" /> : <IonIcon icon={addOutline} />}
                      {creatingCatalog ? 'Creating catalog...' : 'Create catalog'}
                    </button>
                  </form>
                </section>
              ) : (
                <>
                  <div className="wa-active-catalog"><span>Active catalog</span><strong>{catalog.name}</strong></div>
                  <div className="wa-catalog-toolbar">
                    <div className="wa-search"><IonIcon icon={searchOutline} /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search products" aria-label="Search products" /></div>
                    <button type="button" className="wa-sync-button" onClick={() => void handleSync()} disabled={syncing || loadingCatalog}>
                      {syncing ? <IonSpinner name="crescent" /> : <IonIcon icon={syncOutline} />}
                      <span>{syncing ? 'Syncing' : 'Sync Meta'}</span>
                    </button>
                  </div>

                  <div className="wa-subtabs" aria-label="Catalog sections">
                    <button type="button" className={catalogTab === 'products' ? 'is-active' : ''} onClick={() => setCatalogTab('products')}>Products <span>{products.length}</span></button>
                    <button type="button" className={catalogTab === 'categories' ? 'is-active' : ''} onClick={() => setCatalogTab('categories')}>Categories <span>{categories.length}</span></button>
                  </div>

                  {catalogTab === 'products' ? (
                    loadingCatalog ? <div className="wa-loading"><IonSpinner /><span>Loading products...</span></div> : filteredProducts.length ? (
                      <ul className="wa-product-list">
                        {filteredProducts.map((product) => (
                          <li className="wa-product-row" key={product.id}>
                            <div className="wa-product-image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <IonIcon icon={imageOutline} />}</div>
                            <div className="wa-product-info">
                              <div className="wa-product-title-row"><h2>{product.name}</h2><span className={`wa-stock ${product.availability}`}>{product.availability?.replace('_', ' ') || 'in stock'}</span></div>
                              <p>{product.categoryName || categories.find((category) => String(category.id) === String(product.categoryId))?.name || 'Uncategorized'}{product.sku ? ` · SKU ${product.sku}` : ''}</p>
                              <strong>{product.currency || 'INR'} {Number(product.price || 0).toLocaleString()}</strong>
                            </div>
                            <div className="wa-product-actions">
                              <button type="button" onClick={() => openEditProduct(product)} aria-label={`Edit ${product.name}`} title="Edit"><IonIcon icon={createOutline} /></button>
                              <button type="button" onClick={() => setDeleteTarget(product)} aria-label={`Delete ${product.name}`} title="Delete"><IonIcon icon={trashOutline} /></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="wa-empty"><IonIcon icon={cubeOutline} /><h2>{productSearch ? 'No matching products' : 'Catalog created'}</h2><p>{productSearch ? 'Try another product name or SKU.' : 'Your catalog is ready. Add the first product to continue.'}</p>{!productSearch && <button type="button" className="wa-primary-button" onClick={openCreateProduct}><IonIcon icon={addOutline} /> Add product</button>}</div>
                    )
                  ) : (
                    <div className="wa-category-panel">
                      <form className="wa-category-form" onSubmit={(event) => void handleCreateCategory(event)}>
                        <label htmlFor="wa-new-category">Create a category</label>
                        <div><input id="wa-new-category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Clothing" /><button type="submit" disabled={!categoryName.trim()} aria-label="Create category"><IonIcon icon={addOutline} /></button></div>
                      </form>
                      {suggestedCategories.length > 0 && (
                        <div className="wa-category-suggestions">
                          <p>Suggested for {profileCategoryName}</p>
                          <div>
                            {suggestedCategories.map((name) => {
                              const exists = categories.some((category) => category.name.toLowerCase() === name.toLowerCase());
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  disabled={exists || creatingCategory !== null}
                                  onClick={() => void handleAddSuggestedCategory(name)}
                                >
                                  {creatingCategory === name ? <IonSpinner name="crescent" /> : exists ? <IonIcon icon={checkmarkCircleOutline} /> : <IonIcon icon={addOutline} />}
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {categories.length ? <ul className="wa-category-list">{categories.map((category) => <li key={category.id}><IonIcon icon={pricetagOutline} /><span>{category.name}</span><small>{products.filter((product) => String(product.categoryId) === String(category.id)).length} products</small></li>)}</ul> : <p className="wa-muted-message">No categories yet. Create one to organize catalog products.</p>}
                    </div>
                  )}
                </>
              )}
            </section>
          ) : activeTab === 'campaigns' ? (
            <CampaignsTab
              isPaid={isPaid}
              connection={connection}
              templates={messageTemplates}
              conversations={conversations}
              onUpgrade={() => navigate(UPGRADE_ROUTE)}
            />
          ) : activeTab === 'analytics' ? (
            <AnalyticsTab
              isPaid={isPaid}
              conversations={conversations}
              onUpgrade={() => navigate(UPGRADE_ROUTE)}
            />
          ) : (
            <section className={`wa-section wa-inbox-section${selectedConversation ? ' has-conversation' : ''}`}>
              <div className="wa-page-heading wa-inbox-heading">
                <div><p className="wa-eyebrow">CUSTOMER MESSAGES</p><h1>Inbox</h1><p>{totalUnread ? `${totalUnread} unread messages` : 'Conversations with your customers'}</p></div>
                <div className="wa-heading-actions">
                  <button type="button" className="wa-icon-button" onClick={() => void loadConversations()} aria-label="Refresh conversations"><IonIcon icon={refreshOutline} /></button>
                  <button type="button" className="wa-primary-icon" onClick={() => setNewChatOpen(true)} aria-label="New message" title="New message"><IonIcon icon={chatbubbleEllipsesOutline} /></button>
                </div>
              </div>

              <div className="wa-inbox-layout">
                <aside className={`wa-conversation-pane${selectedConversation ? ' is-hidden-mobile' : ''}`}>
                  <div className="wa-search wa-conversation-search"><IonIcon icon={searchOutline} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></div>
                  {loadingInbox && conversations.length === 0 ? <div className="wa-loading"><IonSpinner /><span>Loading conversations...</span></div> : filteredConversations.length ? (
                    <ul className="wa-conversation-list">
                      {filteredConversations.map((conversation) => (
                        <li key={conversation.id}>
                          <button type="button" className={`wa-conversation${selectedConversation?.id === conversation.id ? ' is-selected' : ''}`} onClick={() => void loadMessages(conversation)}>
                            <span className="wa-customer-avatar">{conversation.profileImageUrl ? <img src={conversation.profileImageUrl} alt="" /> : conversation.customerName?.slice(0, 1).toUpperCase() || '?'}</span>
                            <span className="wa-conversation-text"><span><strong>{conversation.customerName || conversation.phoneNumber}</strong><time>{formatTime(conversation.lastMessageAt)}</time></span><small>{conversation.lastMessage || conversation.phoneNumber}</small></span>
                            {conversation.unreadCount > 0 && <span className="wa-conversation-unread">{conversation.unreadCount}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : <div className="wa-empty wa-inbox-empty"><IonIcon icon={logoWhatsapp} /><h2>No conversations</h2><p>Incoming customer messages will appear here.</p></div>}
                </aside>

                <div className={`wa-chat-pane${selectedConversation ? ' is-visible-mobile' : ''}`}>
                  {selectedConversation ? (
                    <>
                      <header className="wa-chat-header">
                        <button type="button" className="wa-chat-back" onClick={() => setSelectedConversation(null)} aria-label="Back to conversations"><IonIcon icon={arrowBackOutline} /></button>
                        <span className="wa-customer-avatar">{selectedConversation.profileImageUrl ? <img src={selectedConversation.profileImageUrl} alt="" /> : selectedConversation.customerName?.slice(0, 1).toUpperCase() || '?'}</span>
                        <div><strong>{selectedConversation.customerName || 'WhatsApp customer'}</strong><small>{selectedConversation.phoneNumber}</small></div>
                        <button type="button" className="wa-icon-button" onClick={() => setShowCustomerDetails((visible) => !visible)} aria-label="Toggle customer details"><IonIcon icon={informationCircleOutline} /></button>
                      </header>
                      <div className="wa-chat-body">
                        <div className="wa-message-list" ref={messageListRef}>
                          {loadingMessages && messages.length === 0 ? <div className="wa-loading"><IonSpinner /><span>Loading messages...</span></div> : messages.length ? messages.map((message) => (
                            <article key={message.id} className={`wa-message ${message.direction === 'outgoing' ? 'is-outgoing' : 'is-incoming'}`}>
                              {message.type === 'product' ? <div className="wa-product-message"><IonIcon icon={cubeOutline} /><span>Product shared{message.text ? `: ${message.text}` : ''}</span></div> : message.mediaUrl && ['image', 'video'].includes(message.type) ? <a href={message.mediaUrl} target="_blank" rel="noreferrer"><img className="wa-message-media" src={message.mediaUrl} alt={message.fileName || 'Message attachment'} /></a> : message.mediaUrl ? <a className="wa-document-link" href={message.mediaUrl} target="_blank" rel="noreferrer"><IonIcon icon={attachOutline} />{message.fileName || 'Open attachment'}</a> : null}
                              {message.text && message.type !== 'product' && <p>{message.text}</p>}
                              <time>
                                {formatTime(message.createdAt)}
                                {message.direction === 'outgoing' && renderStatusTick(message.status)}
                              </time>
                              {message.direction === 'outgoing' && message.status === 'failed' && (
                                <small className="wa-message-error">
                                  <span>{message.errorMessage || 'Message not delivered'}</span>
                                  {isRecipientUnavailableError(message) && (
                                    <span>
                                      Meta could not deliver this to the recipient. Verify the full
                                      number and that it can receive WhatsApp messages.
                                    </span>
                                  )}
                                  {isTemplateMessage(message) && (
                                    <span>Select the approved template above to send it again.</span>
                                  )}
                                  {message.text && !isTemplateMessage(message) && (
                                    <button type="button" onClick={() => void handleRetryMessage(message)}>Retry</button>
                                  )}
                                </small>
                              )}
                            </article>
                          )) : <div className="wa-chat-start"><IonIcon icon={logoWhatsapp} /><p>This is the start of your conversation.</p></div>}
                        </div>
                        {showCustomerDetails && <aside className="wa-customer-details"><div className="wa-details-avatar">{selectedConversation.customerName?.slice(0, 1).toUpperCase() || '?'}</div><h3>{selectedConversation.customerName || 'WhatsApp customer'}</h3><p>{selectedConversation.phoneNumber}</p><div className="wa-details-rule" /><small>Customer details</small><span><IonIcon icon={businessOutline} /> WhatsApp contact</span><span><IonIcon icon={informationCircleOutline} /> {selectedConversation.status || 'Conversation active'}</span></aside>}
                      </div>
                      <form className="wa-composer" onSubmit={(event) => void handleSendMessage(event)}>
                        <div className="wa-template-controls">
                          <label htmlFor="wa-message-template">Message template</label>
                          <div className="wa-template-select-row">
                            <select
                              id="wa-message-template"
                              aria-label="Select approved WhatsApp message template"
                              value={selectedTemplateId}
                              onChange={(event) => {
                                const nextId = event.target.value;
                                const template = messageTemplates.find((item) => String(item.id) === nextId);
                                setSelectedTemplateId(nextId);
                                setTemplateParameters(Array.from({ length: template?.parameterCount ?? 0 }, () => ''));
                                setPageError('');
                              }}
                              disabled={loadingTemplates || sendingTemplate}
                            >
                              <option value="">{loadingTemplates ? 'Loading templates…' : 'Choose an approved template'}</option>
                              {messageTemplates.map((template) => (
                                <option key={template.id} value={String(template.id)} disabled={template.status !== 'APPROVED'}>
                                  {template.displayName} ({template.status})
                                </option>
                              ))}
                            </select>
                            <button type="button" className="wa-template-refresh" onClick={() => void loadMessageTemplates()} disabled={loadingTemplates} title="Refresh templates">
                              {loadingTemplates ? <IonSpinner name="crescent" /> : <IonIcon icon={refreshOutline} />}
                            </button>
                          </div>
                          {selectedMessageTemplate && (
                            <>
                              {selectedMessageTemplate.bodyText && <p className="wa-template-preview">{selectedMessageTemplate.bodyText}</p>}
                              {templateParameters.map((value, index) => (
                                <input
                                  key={`${selectedTemplateId}-${index}`}
                                  value={value}
                                  onChange={(event) => setTemplateParameters((current) => current.map((item, i) => i === index ? event.target.value : item))}
                                  placeholder={`Value for {{${index + 1}}}`}
                                  aria-label={`Template parameter ${index + 1}`}
                                />
                              ))}
                              <button type="button" className="wa-template-send" onClick={() => void handleSendTemplate()} disabled={sendingTemplate || selectedMessageTemplate.status !== 'APPROVED' || templateParameters.some((value) => !value.trim())}>
                                {sendingTemplate ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} />} Send template
                              </button>
                            </>
                          )}
                        </div>
                        {products.length > 0 && <select aria-label="Share a catalog product" value={sharedProductId} onChange={(event) => setSharedProductId(event.target.value)}><option value="">Share a product (optional)</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>}
                        {attachment && <div className="wa-attachment-chip"><IonIcon icon={attachOutline} /><span>{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment"><IonIcon icon={closeOutline} /></button></div>}
                        <div className="wa-composer-row"><label className="wa-attach-button" title="Attach image, video or document"><IonIcon icon={attachOutline} /><input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /></label><input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message" aria-label="Message text" /><button type="submit" disabled={sendingMessage || (!messageText.trim() && !attachment && !sharedProductId)} aria-label="Send message">{sendingMessage ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} />}</button></div>
                      </form>
                    </>
                  ) : <div className="wa-chat-placeholder"><IonIcon icon={logoWhatsapp} /><h2>Your WhatsApp Inbox</h2><p>Choose a conversation to read messages and reply.</p></div>}
                </div>
              </div>
            </section>
          )}
        </main>

        <IonModal isOpen={productModalOpen} onDidDismiss={() => setProductModalOpen(false)} className="wa-product-modal">
          <div className="wa-modal-content">
            <header className="wa-modal-header"><div><p className="wa-eyebrow">WHATSAPP CATALOG</p><h2>{editingProduct ? 'Edit product' : 'Add product'}</h2></div><button type="button" className="wa-icon-button" onClick={() => setProductModalOpen(false)} aria-label="Close"><IonIcon icon={closeOutline} /></button></header>
            {profileCategoryName ? (
              <div className="wa-profile-category">
                <IonIcon icon={businessOutline} />
                <span>From your profile</span>
                <strong>{profileCategoryName}</strong>
              </div>
            ) : (
              <button
                type="button"
                className="wa-profile-category is-missing"
                onClick={() => {
                  setProductModalOpen(false);
                  navigate('/business-setup');
                }}
              >
                <IonIcon icon={informationCircleOutline} />
                <span>Set your business category in Business Setup</span>
              </button>
            )}
            <form id="wa-product-form" className="wa-product-form" onSubmit={(event) => void saveProduct(event)}>
              <label className="wa-image-picker">{productDraft.image ? <><IonIcon icon={imageOutline} /><span>{productDraft.image.name}</span><small>Image selected</small></> : editingProduct?.imageUrl ? <img src={editingProduct.imageUrl} alt="Current product" /> : <><IonIcon icon={imageOutline} /><span>Add product image</span><small>JPG, PNG or WEBP</small></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProductDraft((draft) => ({ ...draft, image: event.target.files?.[0] ?? null }))} /></label>
              <label>Product or service name<input required maxLength={150} value={productDraft.name} onChange={(event) => setProductDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="e.g. Consultation or item name" /></label>
              <label>Product or service description<textarea rows={3} maxLength={1000} value={productDraft.description} onChange={(event) => setProductDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Describe what you offer" /></label>
              <div className="wa-form-grid"><label>Price<input required type="number" min="0" step="0.01" value={productDraft.price} onChange={(event) => setProductDraft((draft) => ({ ...draft, price: event.target.value }))} placeholder="0.00" /></label><label>Currency<select value={productDraft.currency} onChange={(event) => setProductDraft((draft) => ({ ...draft, currency: event.target.value }))}><option value="INR">INR</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select></label></div>
              <div className="wa-form-grid"><label>SKU<input maxLength={80} value={productDraft.sku} onChange={(event) => setProductDraft((draft) => ({ ...draft, sku: event.target.value }))} placeholder="Optional SKU" /></label><label>Availability<select value={productDraft.availability} onChange={(event) => setProductDraft((draft) => ({ ...draft, availability: event.target.value as ProductAvailability }))}><option value="in_stock">In stock</option><option value="out_of_stock">Out of stock</option><option value="preorder">Pre-order</option></select></label></div>
              <label>Catalog category<select value={productDraft.categoryId} onChange={(event) => setProductDraft((draft) => ({ ...draft, categoryId: event.target.value }))}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              {pageError && <p className="wa-form-error">{pageError}</p>}
            </form>
            <footer className="wa-product-savebar">
              <button form="wa-product-form" type="submit" className="wa-primary-button" disabled={savingProduct}>
                {savingProduct ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} />}
                {savingProduct ? 'Saving product...' : editingProduct ? 'Save changes' : 'Save product'}
              </button>
            </footer>
          </div>
        </IonModal>

        <IonModal isOpen={newChatOpen} onDidDismiss={() => setNewChatOpen(false)} className="wa-product-modal wa-chat-modal">
          <div className="wa-modal-content">
            <header className="wa-modal-header">
              <div><p className="wa-eyebrow">WHATSAPP</p><h2>New message</h2></div>
              <button type="button" className="wa-icon-button" onClick={() => setNewChatOpen(false)} aria-label="Close"><IonIcon icon={closeOutline} /></button>
            </header>
            <form id="wa-new-chat-form" className="wa-product-form" onSubmit={(event) => void handleStartConversation(event)}>
              <label>Phone number
                <input required inputMode="tel" value={newChatPhone} onChange={(event) => setNewChatPhone(event.target.value)} placeholder="e.g. 919876543210" />
              </label>
              <label>Message
                <textarea required rows={4} maxLength={1000} value={newChatText} onChange={(event) => setNewChatText(event.target.value)} placeholder="Write your message" />
              </label>
              <p className="wa-muted-message wa-chat-note">
                WhatsApp allows free-form messages only within 24 hours of the customer's last message. For first-time contacts, an approved template is required.
              </p>
              {pageError && <p className="wa-form-error">{pageError}</p>}
            </form>
            <footer className="wa-product-savebar">
              <button form="wa-new-chat-form" type="submit" className="wa-primary-button" disabled={startingChat || !newChatPhone.trim() || !newChatText.trim()}>
                {startingChat ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} />}
                {startingChat ? 'Sending...' : 'Send message'}
              </button>
            </footer>
          </div>
        </IonModal>

        <IonAlert isOpen={Boolean(deleteTarget)} header="Delete product?" message={`Remove ${deleteTarget?.name || 'this product'} from your catalog?`} buttons={[{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive', handler: () => void handleDeleteProduct() }]} onDidDismiss={() => setDeleteTarget(null)} />
        <IonToast isOpen={Boolean(toast)} message={toast} duration={2500} color="success" onDidDismiss={() => setToast('')} />
      </IonContent>
    </IonPage>
  );
};

export default WhatsAppWorkspace;