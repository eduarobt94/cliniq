import { useNavigate } from 'react-router-dom';
import { LandingNav } from './LandingNav';
import { LandingHero } from './LandingHero';
import { LandingProduct } from './LandingProduct';
import { LandingHow } from './LandingHow';
import { LandingStory } from './LandingStory';
import { LandingPricing } from './LandingPricing';
import { LandingFooter } from './LandingFooter';

export function Landing() {
  const navigate = useNavigate();
  const toLogin = () => navigate('/login');

  return (
    <main className="bg-[var(--cq-bg)] text-[var(--cq-fg)]">
      <LandingNav onLogin={toLogin} onSignup={toLogin} />
      <LandingHero onLogin={toLogin} onSignup={toLogin} />
      <LandingProduct />
      <LandingHow />
      <LandingStory />
      <LandingPricing onSignup={toLogin} />
      <LandingFooter onSignup={toLogin} />
    </main>
  );
}
