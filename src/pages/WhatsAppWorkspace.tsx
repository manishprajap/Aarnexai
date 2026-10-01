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
  businessOutline,
  checkmarkCircleOutline,
  closeOutline,
  createOutline,
  cubeOutline,
  imageOutline,
  informationCircleOutline,
  logoWhatsapp,
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
  ProductAvailability,
  ProductInput,
  WhatsAppCatalog,
  WhatsAppConversation,
  WhatsAppMessage,
  createCatalogCategory,
  createCatalogProduct,
  createWhatsAppCatalog,
  deleteCatalogProduct,
  getCatalogCategories,
  getCatalogProducts,
  getWhatsAppCatalog,
  getWhatsAppConversations,
  getWhatsAppMessages,
  sendWhatsAppMessage,
  syncWhatsAppCatalog,
  updateCatalogProduct,
} from '../services/whatsappCommerce';
import './WhatsAppWorkspace.css';

type WorkspaceTab = 'catalog' | 'inbox';
type CatalogTab = 'products' | 'categories';

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

const formatTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const initialTab: WorkspaceTab = searchParams.get('view') === 'inbox' ? 'inbox' : 'catalog';
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('products');
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

  useEffect(() => {
    void loadCatalog();
    void loadConversations();
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

  const updateActiveTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'inbox') next.set('view', 'inbox');
    else next.delete('view');
    setSearchParams(next, { replace: true });
    if (tab === 'inbox' && conversations.length === 0) void loadConversations();
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

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversation || (!messageText.trim() && !attachment && !sharedProductId)) return;
    setSendingMessage(true);
    setPageError('');
    try {
      await sendWhatsAppMessage(
        selectedConversation.id,
        messageText,
        attachment,
        sharedProductId || undefined
      );
      setMessageText('');
      setAttachment(null);
      setSharedProductId('');
      await Promise.all([loadMessages(selectedConversation), loadConversations()]);
    } catch (error) {
      setPageError(errorText(error));
    } finally {
      setSendingMessage(false);
    }
  };

  const totalUnread = conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);

  return (
    <IonPage className="wa-workspace-page">
      <IonContent fullscreen>
        <header className="wa-topbar">
          <button type="button" className="wa-icon-button" onClick={() => navigate(-1)} aria-label="Go back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <div className="wa-brand"><IonIcon icon={logoWhatsapp} /><span>WhatsApp Business</span></div>
          <button
            type="button"
            className="wa-icon-button"
            onClick={() => activeTab === 'catalog' ? void loadCatalog() : void loadConversations()}
            aria-label="Refresh"
          >
            <IonIcon icon={refreshOutline} />
          </button>
        </header>

        <main className="wa-workspace-content">
          <nav className="wa-main-tabs" aria-label="WhatsApp workspace">
            <button type="button" className={activeTab === 'catalog' ? 'is-active' : ''} onClick={() => updateActiveTab('catalog')}>
              <IonIcon icon={cubeOutline} /> Catalog
            </button>
            <button type="button" className={activeTab === 'inbox' ? 'is-active' : ''} onClick={() => updateActiveTab('inbox')}>
              <IonIcon icon={logoWhatsapp} /> Inbox
              {totalUnread > 0 && <span className="wa-unread-badge">{totalUnread}</span>}
            </button>
          </nav>

          {pageError && (
            <div className="wa-error" role="alert">
              <IonIcon icon={informationCircleOutline} />
              <span>{pageError}</span>
              <button type="button" onClick={() => setPageError('')} aria-label="Dismiss error"><IonIcon icon={closeOutline} /></button>
            </div>
          )}

          {activeTab === 'catalog' ? (
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
          ) : (
            <section className={`wa-section wa-inbox-section${selectedConversation ? ' has-conversation' : ''}`}>
              <div className="wa-page-heading wa-inbox-heading">
                <div><p className="wa-eyebrow">CUSTOMER MESSAGES</p><h1>Inbox</h1><p>{totalUnread ? `${totalUnread} unread messages` : 'Conversations with your customers'}</p></div>
                <button type="button" className="wa-primary-icon" onClick={() => void loadConversations()} aria-label="Refresh conversations"><IonIcon icon={refreshOutline} /></button>
              </div>

              <div className="wa-inbox-layout">
                <aside className={`wa-conversation-pane${selectedConversation ? ' is-hidden-mobile' : ''}`}>
                  <div className="wa-search wa-conversation-search"><IonIcon icon={searchOutline} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></div>
                  {loadingInbox ? <div className="wa-loading"><IonSpinner /><span>Loading conversations...</span></div> : filteredConversations.length ? (
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
                          {loadingMessages ? <div className="wa-loading"><IonSpinner /><span>Loading messages...</span></div> : messages.length ? messages.map((message) => (
                            <article key={message.id} className={`wa-message ${message.direction === 'outgoing' ? 'is-outgoing' : 'is-incoming'}`}>
                              {message.type === 'product' ? <div className="wa-product-message"><IonIcon icon={cubeOutline} /><span>Product shared{message.text ? `: ${message.text}` : ''}</span></div> : message.mediaUrl && ['image', 'video'].includes(message.type) ? <a href={message.mediaUrl} target="_blank" rel="noreferrer"><img className="wa-message-media" src={message.mediaUrl} alt={message.fileName || 'Message attachment'} /></a> : message.mediaUrl ? <a className="wa-document-link" href={message.mediaUrl} target="_blank" rel="noreferrer"><IonIcon icon={attachOutline} />{message.fileName || 'Open attachment'}</a> : null}
                              {message.text && message.type !== 'product' && <p>{message.text}</p>}
                              <time>{formatTime(message.createdAt)}</time>
                            </article>
                          )) : <div className="wa-chat-start"><IonIcon icon={logoWhatsapp} /><p>This is the start of your conversation.</p></div>}
                        </div>
                        {showCustomerDetails && <aside className="wa-customer-details"><div className="wa-details-avatar">{selectedConversation.customerName?.slice(0, 1).toUpperCase() || '?'}</div><h3>{selectedConversation.customerName || 'WhatsApp customer'}</h3><p>{selectedConversation.phoneNumber}</p><div className="wa-details-rule" /><small>Customer details</small><span><IonIcon icon={businessOutline} /> WhatsApp contact</span><span><IonIcon icon={informationCircleOutline} /> {selectedConversation.status || 'Conversation active'}</span></aside>}
                      </div>
                      <form className="wa-composer" onSubmit={(event) => void handleSendMessage(event)}>
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

        <IonAlert isOpen={Boolean(deleteTarget)} header="Delete product?" message={`Remove ${deleteTarget?.name || 'this product'} from your catalog?`} buttons={[{ text: 'Cancel', role: 'cancel' }, { text: 'Delete', role: 'destructive', handler: () => void handleDeleteProduct() }]} onDidDismiss={() => setDeleteTarget(null)} />
        <IonToast isOpen={Boolean(toast)} message={toast} duration={2500} color="success" onDidDismiss={() => setToast('')} />
      </IonContent>
    </IonPage>
  );
};

export default WhatsAppWorkspace;
