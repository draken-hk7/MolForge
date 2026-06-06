import { useCallback, useEffect, useState } from 'react';

import { api } from '../utils/api';

export function useCloudCompute() {
  const [job, setJob] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    try {
      setStats((await api.get('/api/cloud/stats')).data);
    } catch (nextError) {
      setError(nextError.message);
    }
  }, []);

  const submit = useCallback(async (smiles, moleculeId = null) => {
    setError('');
    const { data } = await api.post('/api/cloud/submit', { smiles, job_type: 'xtb', molecule_id: moleculeId });
    setJob(data);
    return data;
  }, []);

  useEffect(() => {
    if (!job?.job_id || ['completed', 'failed'].includes(job.status)) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const { data } = await api.get(`/api/cloud/status/${job.job_id}`);
        setJob(data);
      } catch (nextError) {
        setError(nextError.message);
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [job]);

  return { job, stats, error, submit, loadStats };
}
