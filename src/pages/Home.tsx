import React, { useState } from 'react';
import { useIonRouter } from '@ionic/react';

import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonIcon,
  IonButton,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/react';

import {
  cameraOutline,
  cloudUploadOutline,
  imagesOutline,
  sparklesOutline,
  timeOutline,
  personOutline,
  logOutOutline,
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';
import logo from '../assets/aarna-logo.jpeg';

import './Home.css';

const Home: React.FC = () => {
  const ionRouter = useIonRouter();

  const {
    user,
    logout,
    isAuthenticated,
    hasBusiness,
    hasSubscription,
  } = useAuth();

  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const [accountPopoverEvent, setAccountPopoverEvent] =
    useState<MouseEvent | undefined>(undefined);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const initial = (user?.name || user?.email || '?')
    .charAt(0)
    .toUpperCase();

  /**
   * ============================================================
   * NAVIGATION
   * ============================================================
   */

  const goToUpload = () => {
    console.log('[HOME] Upload clicked');

    console.log('[HOME] Auth state:', {
      isAuthenticated,
      hasBusiness,
      hasSubscription,
    });

    ionRouter.push('/upload', 'forward');
  };

  const goToPosters = () => {
    console.log('[HOME] Posters clicked');

    console.log('[HOME] Auth state:', {
      isAuthenticated,
      hasBusiness,
      hasSubscription,
    });

    ionRouter.push('/posters', 'forward');
  };

  const goToProductDetails = () => {
    console.log('[HOME] Product details clicked');

    ionRouter.push('/product-details', 'forward');
  };

  const goToProfile = () => {
    setAccountPopoverOpen(false);
    setAccountPopoverEvent(undefined);

    ionRouter.push('/profile', 'forward');
  };

  const handleLogout = () => {
    setAccountPopoverOpen(false);
    setAccountPopoverEvent(undefined);

    logout();

    ionRouter.push('/login', 'root', 'replace');
  };

  /**
   * ============================================================
   * ACCOUNT MENU
   * ============================================================
   */

  const openAccountMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAccountPopoverEvent(event.nativeEvent);
    setAccountPopoverOpen(true);
  };

  return (
    <IonPage>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">

          <div className="flex items-center justify-between px-4 py-2">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img
                src={logo}
                alt="Aarna Market OS"
                className="header-logo"
              />
            </div>

            {/* Account */}
            <button
              type="button"
              className="avatar-trigger"
              aria-label="Account menu"
              onClick={openAccountMenu}
            >
              <span>{initial}</span>
            </button>

            {/* Account Popover */}
            <IonPopover
              isOpen={accountPopoverOpen}
              event={accountPopoverEvent}
              onDidDismiss={() => {
                setAccountPopoverOpen(false);
                setAccountPopoverEvent(undefined);
              }}
              side="bottom"
              alignment="end"
              className="account-popover"
            >
              <IonList
                lines="none"
                className="account-menu"
              >
                <IonItem
                  button
                  detail={false}
                  onClick={goToProfile}
                >
                  <IonIcon
                    icon={personOutline}
                    slot="start"
                  />

                  <IonLabel>
                    Profile
                  </IonLabel>
                </IonItem>

                <IonItem
                  button
                  detail={false}
                  onClick={handleLogout}
                >
                  <IonIcon
                    icon={logOutOutline}
                    slot="start"
                    color="danger"
                  />

                  <IonLabel color="danger">
                    Logout
                  </IonLabel>
                </IonItem>
              </IonList>
            </IonPopover>

          </div>

        </IonToolbar>
      </IonHeader>

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <IonContent
        fullscreen
        className="bg-gray-50"
      >
        <div className="min-h-full bg-gray-50 px-4 pb-8 pt-4">

          {/* ====================================================
              WELCOME
          ==================================================== */}

          <div className="header-text">
            <h1 className="m-0">
              Welcome back
            </h1>

            <p className="m-0">
              Hi, {firstName}
            </p>
          </div>

          {/* ====================================================
              HERO
          ==================================================== */}

          <div className="hero-card mb-6 rounded-2xl p-5">

            <div className="mb-4 flex items-center gap-2.5">

              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl hero-icon-chip">
                <IonIcon
                  icon={sparklesOutline}
                  className="text-lg text-white"
                />
              </div>

              <h2 className="hero-heading m-0">
                Create professional ads with AI
              </h2>

            </div>

            <p className="mb-5 max-w-sm text-[13px] leading-5 text-white/70">
              Upload your product photo and let AI create marketing content for you.
            </p>

            <IonButton
              type="button"
              expand="block"
              className="hero-button"
              onClick={goToUpload}
            >
              <IonIcon
                slot="start"
                icon={cloudUploadOutline}
              />

              Upload product
            </IonButton>

          </div>

          {/* ====================================================
              AI FEATURES
          ==================================================== */}

          <div className="mb-6">

            <h3 className="section-title">
              What AI can do
            </h3>

            <div className="grid grid-cols-2 gap-3">

              {/* Product details (renamed from "Product detection"; now clickable) */}
              <button
                type="button"
                className="w-full cursor-pointer rounded-xl border border-gray-100 bg-white p-3.5 text-left"
                onClick={goToProductDetails}
              >

                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <IonIcon
                    icon={sparklesOutline}
                    className="text-base text-blue-600"
                  />
                </div>

                <h4 className="feature-title">
                  Product details
                </h4>

                <p className="feature-desc">
                  View brand, product and category info.
                </p>

              </button>

              {/* AI Posters */}
              <button
                type="button"
                className="w-full cursor-pointer rounded-xl border border-gray-100 bg-white p-3.5 text-left"
                onClick={goToPosters}
              >

                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                  <IonIcon
                    icon={imagesOutline}
                    className="text-base text-purple-600"
                  />
                </div>

                <h4 className="feature-title">
                  AI posters
                </h4>

                <p className="feature-desc">
                  Generates different professional designs.
                </p>

              </button>

              {/* AI Content */}
              <div className="rounded-xl border border-gray-100 bg-white p-3.5">

                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                  <IonIcon
                    icon={sparklesOutline}
                    className="text-base text-green-600"
                  />
                </div>

                <h4 className="feature-title">
                  AI content
                </h4>

                <p className="feature-desc">
                  Captions, descriptions, SEO and hashtags.
                </p>

              </div>

              {/* 10 Day Plan */}
              <div className="rounded-xl border border-gray-100 bg-white p-3.5">

                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                  <IonIcon
                    icon={timeOutline}
                    className="text-base text-orange-500"
                  />
                </div>

                <h4 className="feature-title">
                  10-day plan
                </h4>

                <p className="feature-desc">
                  A different marketing post every day.
                </p>

              </div>

            </div>

          </div>

          {/* ====================================================
              RECENT CAMPAIGNS
          ==================================================== */}

          <div>

            <h3 className="section-title">
              Recent campaigns
            </h3>

            <div className="rounded-xl border border-gray-100 bg-white p-4">

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                  <IonIcon
                    icon={imagesOutline}
                    className="text-xl text-gray-400"
                  />
                </div>

                <div className="min-w-0 flex-1">

                  <h4 className="m-0 truncate card-title">
                    No campaigns yet
                  </h4>

                  <p className="card-subtitle">
                    Upload your first product to get started.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>
      </IonContent>

    </IonPage>
  );
};

export default Home;