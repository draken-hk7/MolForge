import { Send } from 'lucide-react';
import { useState } from 'react';

import { api } from '../../utils/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function ValueCorrection({ moleculeId, properties }) {
  const auth = useAuth();
  const keys = Object.keys(properties || {});
  const [propertyName, setPropertyName] = useState(keys[0] || 'bandgap_ev');
  const [value, setValue] = useState('');
  const [source, setSource] = useState('From experiment');
  const [done, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const payload = { molecule_id: moleculeId || null, property_name: propertyName, predicted_value: properties?.[propertyName]?.value ?? null, corrected_value: Number(value), source };
    try {
      await api.post('/api/feedback/correction', payload);
    } catch {
      const { error } = await supabase.from('predictions_feedback').insert({ ...payload, correction_source: source, source: 'user_correction', user_id: auth.user.id });
      if (error) throw error;
    }
    setDone(true);
    setValue('');
  };

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_1fr]">
      <select value={propertyName} onChange={(event) => setPropertyName(event.target.value)} className="rounded-md border border-white/10 bg-[#15151f] px-2 py-2 text-xs text-slate-200">{keys.map((key) => <option key={key}>{key}</option>)}</select>
      <input required type="number" step="any" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Actual value" className="rounded-md border border-white/10 bg-black/30 px-2 py-2 text-xs text-white outline-none" />
      <select value={source} onChange={(event) => setSource(event.target.value)} className="rounded-md border border-white/10 bg-[#15151f] px-2 py-2 text-xs text-slate-200"><option>From experiment</option><option>From literature</option><option>From another tool</option></select>
      <button className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white"><Send size={13} /> {done ? 'Saved' : 'Submit correction'}</button>
    </form>
  );
}
