import { useCallback, useState } from 'react';

import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { api } from '../utils/api';

export function useCollaboration() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (action) => {
    if (!auth.user) {
      auth.openAuth();
      throw new Error('Sign in to save, share, fork, or comment.');
    }
    setLoading(true);
    setError('');
    try {
      return await action();
    } catch (nextError) {
      setError(nextError.message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  return {
    loading,
    error,
    saveMolecule: (payload) => run(async () => {
      try { return (await api.post('/api/collab/molecules/save', payload)).data; } catch {
        const { data, error: nextError } = await supabase.from('molecules').insert({ ...payload, user_id: auth.user.id }).select().single();
        if (nextError) throw nextError;
        return data;
      }
    }),
    shareMolecule: (id, isPublic = true) => run(async () => {
      try { return (await api.post(`/api/collab/molecules/${id}/share`, { is_public: isPublic })).data; } catch {
        const { data, error: nextError } = await supabase.from('molecules').update({ is_public: isPublic }).eq('id', id).select().single();
        if (nextError) throw nextError;
        return { ...data, share_url: `/m/${data.share_token}` };
      }
    }),
    forkMolecule: (id) => run(async () => {
      try { return (await api.post(`/api/collab/molecules/${id}/fork`)).data; } catch {
        const { data: source, error: sourceError } = await supabase.from('molecules').select('*').eq('id', id).eq('is_public', true).single();
        if (sourceError) throw sourceError;
        const { data, error: nextError } = await supabase.from('molecules').insert({ user_id: auth.user.id, name: `${source.name} (fork)`, smiles: source.smiles, mol_data: source.mol_data, properties: source.properties, mp_data: source.mp_data, tags: source.tags, forked_from: id }).select().single();
        if (nextError) throw nextError;
        return data;
      }
    }),
    createWorkspace: (payload) => run(async () => {
      try { return (await api.post('/api/collab/workspaces', payload)).data; } catch {
        const { data, error: nextError } = await supabase.from('shared_workspaces').insert({ ...payload, owner_id: auth.user.id, members: [auth.user.id] }).select().single();
        if (nextError) throw nextError;
        return data;
      }
    }),
    invite: (id, email) => run(async () => {
      try { return (await api.post(`/api/collab/workspaces/${id}/invite`, { email })).data; } catch {
        const { data, error: nextError } = await supabase.from('workspace_invites').upsert({ workspace_id: id, email, invited_by: auth.user.id }).select().single();
        if (nextError) throw nextError;
        return data;
      }
    }),
    comment: (moleculeId, content) => run(async () => {
      try { return (await api.post('/api/collab/comments', { molecule_id: moleculeId, content })).data; } catch {
        const { data, error: nextError } = await supabase.from('comments').insert({ molecule_id: moleculeId, content, user_id: auth.user.id }).select().single();
        if (nextError) throw nextError;
        return data;
      }
    })
  };
}
