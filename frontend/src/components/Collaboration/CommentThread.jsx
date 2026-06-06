import { MessageSquare, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useCollaboration } from '../../hooks/useCollaboration';
import { getMoleculeComments } from '../../utils/api';

export default function CommentThread({ moleculeId }) {
  const auth = useAuth();
  const collaboration = useCollaboration();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (moleculeId) getMoleculeComments(moleculeId).then(setComments).catch(() => setComments([]));
  }, [moleculeId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    const row = await collaboration.comment(moleculeId, content.trim());
    setComments((items) => [...items, row]);
    setContent('');
  };

  return (
    <section className="glass-panel rounded-lg p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><MessageSquare size={16} /> Discussion</h2>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {comments.map((comment) => <div key={comment.id} className="rounded-md border border-white/10 bg-black/20 px-3 py-2"><div className="text-xs text-slate-200">{comment.content}</div><div className="mt-1 text-[10px] text-slate-500">{new Date(comment.created_at).toLocaleString()}</div></div>)}
        {!comments.length && <p className="text-xs text-slate-500">No comments yet.</p>}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2"><input value={content} onChange={(event) => setContent(event.target.value)} placeholder={auth.user ? 'Add a comment' : 'Sign in to comment'} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60" /><button className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500 text-white" title="Post comment"><Send size={16} /></button></form>
    </section>
  );
}
