import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../utils/api';

const TERMINAL_STATUSES = new Set(['completed', 'failed']);

export function useCloudCompute() {
  const [job, setJob] = useState(null);
  const [stats, setStats] = useState(null);
  const [providers, setProviders] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [cloudResult, setCloudResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(0);
  const [error, setError] = useState('');
  const pollTimer = useRef(null);
  const progressTimer = useRef(null);
  const onCompleteRef = useRef(null);
  const startedAtRef = useRef(0);
  const etaStartRef = useRef(45);

  const cancelPolling = useCallback(() => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    if (progressTimer.current) window.clearInterval(progressTimer.current);
    pollTimer.current = null;
    progressTimer.current = null;
  }, []);

  const acceptJob = useCallback((nextJob) => {
    setJob(nextJob);
    setProgress(Number(nextJob.progress_pct ?? nextJob.progress ?? 0));
    if (nextJob.provider) setJob((current) => ({ ...current, provider: nextJob.provider }));
    if (nextJob.status === 'completed') {
      setCloudResult(nextJob.result || null);
      setEta(0);
      cancelPolling();
      onCompleteRef.current?.(nextJob.result || null);
    } else if (nextJob.status === 'failed') {
      setEta(0);
      cancelPolling();
      setError(nextJob.error || 'Cloud calculation unavailable. Showing local ML prediction.');
    }
  }, [cancelPolling]);

  const pollJobStatus = useCallback(async (jobId) => {
    const { data } = await api.get(`/api/cloud/status/${jobId}`);
    acceptJob(data);
    return data;
  }, [acceptJob]);

  const startPolling = useCallback((jobId, initialEta = 45) => {
    cancelPolling();
    startedAtRef.current = Date.now();
    etaStartRef.current = initialEta || 45;
    setEta(etaStartRef.current);
    pollTimer.current = window.setInterval(() => {
      pollJobStatus(jobId).catch((nextError) => {
        setError(nextError.response?.data?.detail || nextError.message);
        cancelPolling();
      });
    }, 3000);
    progressTimer.current = window.setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      setEta(Math.max(0, Math.ceil(etaStartRef.current - elapsed)));
      setProgress((current) => Math.min(92, Math.max(current, Math.round((elapsed / etaStartRef.current) * 88))));
    }, 750);
  }, [cancelPolling, pollJobStatus]);

  const submitJob = useCallback(async (smiles, moleculeId = null, onComplete = null) => {
    setError('');
    setCloudResult(null);
    setProgress(0);
    onCompleteRef.current = onComplete;
    const { data } = await api.post('/api/cloud/submit', { smiles, molecule_id: moleculeId });
    acceptJob(data);
    if (!data.cached && !TERMINAL_STATUSES.has(data.status)) startPolling(data.job_id, data.eta_seconds);
    return data;
  }, [acceptJob, startPolling]);

  const loadStats = useCallback(async () => {
    try {
      const [statsResponse, providersResponse, cacheResponse, jobsResponse] = await Promise.all([
        api.get('/api/cloud/stats'),
        api.get('/api/cloud/providers'),
        api.get('/api/cloud/cache-stats'),
        api.get('/api/cloud/jobs')
      ]);
      setStats(statsResponse.data);
      setProviders(providersResponse.data);
      setCacheStats(cacheResponse.data);
      setRecentJobs(jobsResponse.data);
    } catch (nextError) {
      setError(nextError.response?.data?.detail || nextError.message);
    }
  }, []);

  const submitBatch = useCallback(async (smilesList) => {
    const { data } = await api.post('/api/cloud/batch', { smiles_list: smilesList });
    setRecentJobs((current) => [...data, ...current]);
    return data;
  }, []);

  useEffect(() => cancelPolling, [cancelPolling]);

  return {
    job,
    stats,
    providers,
    cacheStats,
    recentJobs,
    cloudResult,
    error,
    progress,
    eta,
    provider: job?.provider || null,
    isCalculating: Boolean(job && !TERMINAL_STATUSES.has(job.status)),
    submitJob,
    submit: submitJob,
    pollJobStatus,
    cancelPolling,
    loadStats,
    submitBatch
  };
}
