import React from 'react';
import { IonIcon } from '@ionic/react';
import { lockClosedOutline } from 'ionicons/icons';

interface UpgradeGateProps {
  feature: string;
  description?: string;
  onUpgrade: () => void;
  compact?: boolean;
}

const UpgradeGate: React.FC<UpgradeGateProps> = ({ feature, description, onUpgrade, compact }) => (
  <div className={`wa-upgrade-gate${compact ? ' is-compact' : ''}`}>
    <span className="wa-upgrade-icon"><IonIcon icon={lockClosedOutline} /></span>
    <div className="wa-upgrade-text">
      <strong>{feature}</strong>
      <small>{description || 'Available on the Pro plan.'}</small>
    </div>
    <button type="button" className="wa-primary-button" onClick={onUpgrade}>Upgrade to Pro</button>
  </div>
);

export default UpgradeGate;