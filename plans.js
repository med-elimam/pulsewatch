// plans.js — single source of truth for pricing. Imported by both server and views
// so prices/labels/limits are guaranteed identical everywhere (landing, /pricing, /billing,
// checkout buttons, docs). Prices must match the Paddle product catalog exactly.
export const TAX_NOTE = 'Taxes may apply and will be calculated at checkout.';

export const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, monitors: 3,
    blurb: 'Good for testing and personal jobs',
    cta: 'Start free',
    features: ['3 monitors', 'Email alerts', 'Basic cron heartbeat monitoring', 'Alert history'],
  },
  {
    id: 'starter', name: 'Starter', price: 5, monitors: 25,
    blurb: 'For solo developers and small projects',
    cta: 'Upgrade to Starter',
    features: ['25 monitors', 'Email alerts', 'Slack alerts', 'Alert history', 'Recovery notifications'],
  },
  {
    id: 'pro', name: 'Pro', price: 12, monitors: 100, highlight: true,
    blurb: 'For indie SaaS founders and small teams',
    cta: 'Upgrade to Pro',
    features: ['100 monitors', 'Email alerts', 'Slack alerts', 'Alert history', 'Recovery notifications', 'Priority monitoring checks'],
  },
  {
    id: 'team', name: 'Team', price: 29, monitors: 500,
    blurb: 'For agencies and production teams',
    cta: 'Upgrade to Team',
    features: ['500 monitors', 'Email alerts', 'Slack alerts', 'Alert history', 'Recovery notifications', 'Team-scale monitoring'],
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map(p => [p.id, p]));
export const PLAN_LIMIT = Object.fromEntries(PLANS.map(p => [p.id, p.monitors]));
// Billing frequency is ALWAYS shown. Never render a bare "$5".
export const priceLabel = (p) => (p.price === 0 ? '$0/month' : `$${p.price}/month`);
export const planName = (id) => (PLAN_BY_ID[id]?.name || 'Free');
