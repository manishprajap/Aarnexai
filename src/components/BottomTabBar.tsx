import React from 'react';
import { IonFooter, IonIcon } from '@ionic/react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  add,
  addOutline,
  home,
  homeOutline,
  images,
  imagesOutline,
  person,
  personOutline,
  link,
  linkOutline,
} from 'ionicons/icons';

import './BottomTabBar.css';

type Tab = {
  path: string;
  label: string;
  icon: string;
  activeIcon: string;
  primary?: boolean;
};

const TABS: Tab[] = [
  { path: '/', label: 'Home', icon: homeOutline, activeIcon: home },
  { path: '/posters', label: 'Posters', icon: imagesOutline, activeIcon: images },
  { path: '/upload', label: 'Create', icon: addOutline, activeIcon: add, primary: true },
  { path: '/social-connections', label: 'Social', icon: linkOutline, activeIcon: link },
  { path: '/profile', label: 'Profile', icon: personOutline, activeIcon: person },
];

const BottomTabBar: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <IonFooter className="ion-no-border tab-footer">
      <nav className="tab-bar" aria-label="Main navigation">
        {TABS.map((tab) => {
          const active = isActive(tab.path);

          return (
            <button
              key={tab.path}
              type="button"
              className={[
                'tab-item',
                active ? 'is-active' : '',
                tab.primary ? 'is-primary' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (!active) navigate(tab.path, { replace: true });
              }}
            >
              <span className="tab-icon">
                <IonIcon icon={active ? tab.activeIcon : tab.icon} />
              </span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </IonFooter>
  );
};

export default BottomTabBar;