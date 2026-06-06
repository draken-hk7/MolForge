import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { track } from '../lib/telemetry';

export default function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    track('page_viewed', { page_name: location.pathname });
  }, [location.pathname]);
  return null;
}
