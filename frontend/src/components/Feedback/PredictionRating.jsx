import { Star } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { track } from '../../lib/telemetry';
import { supabase } from '../../lib/supabase';
import { api } from '../../utils/api';
import ValueCorrection from './ValueCorrection';

export default function PredictionRating({ moleculeId, properties }) {
  const auth = useAuth();
  const [rating, setRating] = useState(0);
  const [showCorrection, setShowCorrection] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (value) => {
    if (!auth.user) return auth.openAuth();
    setRating(value);
    try {
      try {
        await api.post('/api/feedback/rating', { molecule_id: moleculeId || null, rating: value, feedback_text: '' });
      } catch {
        const { error } = await supabase.from('predictions_feedback').insert({ molecule_id: moleculeId || null, user_id: auth.user.id, rating: value, feedback_text: '', source: 'user_correction' });
        if (error) throw error;
      }
      track('feedback_submitted', { rating: value });
      setMessage('Thanks. Rating saved.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><div className="text-xs font-semibold text-slate-300">Rate prediction accuracy</div>{message && <div className="text-[10px] text-slate-500">{message}</div>}</div>
        <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => submit(value)} className={value <= rating ? 'text-amber-300' : 'text-slate-600'} title={`${value} stars`}><Star size={16} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div>
      </div>
      <button type="button" onClick={() => setShowCorrection((value) => !value)} className="mt-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200">Correct a value</button>
      {showCorrection && <ValueCorrection moleculeId={moleculeId} properties={properties} />}
    </div>
  );
}
