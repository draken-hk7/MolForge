import * as Sentry from '@sentry/react';
import mixpanel from 'mixpanel-browser';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();
const mixpanelToken = import.meta.env.VITE_MIXPANEL_TOKEN?.trim();

if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.1, environment: import.meta.env.MODE });
}

if (mixpanelToken) {
  mixpanel.init(mixpanelToken, { track_pageview: false, persistence: 'localStorage' });
}

export function track(event, properties = {}) {
  if (mixpanelToken) mixpanel.track(event, properties);
}

export function identify(user) {
  if (!mixpanelToken || !user) return;
  mixpanel.identify(user.id);
  mixpanel.people.set({ $email: user.email, tier: user.profile?.tier || 'free' });
}

export function capture(error, context = {}) {
  if (sentryDsn) Sentry.captureException(error, { extra: context });
}
