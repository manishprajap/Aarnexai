import { useCallback, useState } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToolbar,
  useIonViewWillEnter,
  useIonRouter,
} from '@ionic/react';
import { calendarOutline, refreshOutline, timeOutline } from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';
import { fetchPromptPlan, fillPromptTemplate, type PromptPlanItem } from '../utils/promptPlan';
import BottomTabBar from '../components/BottomTabBar';
import './PromptPlan.css';

function formatPlanDate(startDate: string | null, day: number): string {
  if (!startDate) return `Day ${day}`;
  const [year, month, date] = startDate.slice(0, 10).split('-').map(Number);
  const scheduledDate = new Date(year, month - 1, date + day - 1);
  if (Number.isNaN(scheduledDate.getTime())) return `Day ${day}`;
  return scheduledDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const PromptPlan: React.FC = () => {
  const ionRouter = useIonRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<PromptPlanItem[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchPromptPlan();
      setItems(response.items);
      setStartDate(response.startDate);
    } catch (loadError) {
      console.error('Could not load prompt plan page:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Could not load your prompt plan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useIonViewWillEnter(() => {
    void loadPlan();
  });

  const category = String(user?.category ?? user?.businessCategoryName ?? '').trim();
  const location = String(user?.city ?? '').trim();

  return (
    <IonPage className="prompt-plan-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" text="" />
          </IonButtons>
          <div className="prompt-plan-toolbar-title">30-Day Prompt Plan</div>
          <IonButtons slot="end">
            <button
              type="button"
              className="prompt-plan-refresh"
              onClick={() => void loadPlan()}
              disabled={loading}
              aria-label="Refresh prompt plan"
            >
              <IonIcon icon={refreshOutline} />
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="prompt-plan-content">
        <main className="prompt-plan-container">
          <header className="prompt-plan-heading">
            <span className="prompt-plan-heading-icon"><IonIcon icon={calendarOutline} /></span>
            <p className="prompt-plan-kicker">YOUR CONTENT ROADMAP</p>
            <h1>Daily prompts</h1>
            <p>All your saved campaign ideas in one place. Open a day to use its prompt for content creation.</p>
            {items.length > 0 && (
              <div className="prompt-plan-summary">
                <span><IonIcon icon={timeOutline} /> {items.length} planned days</span>
                {startDate && <span>Starts {formatPlanDate(startDate, 1)}</span>}
              </div>
            )}
          </header>

          {loading ? (
            <div className="prompt-plan-state" role="status">
              <IonSpinner name="crescent" />
              <span>Loading your saved prompts…</span>
            </div>
          ) : error ? (
            <div className="prompt-plan-state prompt-plan-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => void loadPlan()}>Try again</button>
            </div>
          ) : items.length === 0 ? (
            <div className="prompt-plan-state prompt-plan-empty">
              <h2>No prompt plan yet</h2>
              <p>Generate your 30-day plan from the dashboard. Your saved daily prompts will appear here.</p>
              <button type="button" onClick={() => ionRouter.push('/dashboard', 'root')}>
                Go to dashboard
              </button>
            </div>
          ) : (
            <section className="prompt-plan-list" aria-label="Daily content prompts">
              {items.map((item) => (
                <article className="prompt-plan-card" key={item.day}>
                  <div className="prompt-plan-card-top">
                    <span className="prompt-plan-day">DAY {item.day}</span>
                    <time>{formatPlanDate(startDate, item.day)}</time>
                  </div>
                  {item.theme && <h2>{item.theme}</h2>}
                  <p>{fillPromptTemplate(item.prompt, { category, location })}</p>
                </article>
              ))}
            </section>
          )}
        </main>
      </IonContent>
      <BottomTabBar />
    </IonPage>
  );
};

export default PromptPlan;
