import { Check, Copy, Eye, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { useCollaboration } from '../../hooks/useCollaboration';

export default function ShareButton({ molecule }) {
  const collaboration = useCollaboration();
  const [shared, setShared] = useState(molecule?.is_public ? molecule : null);
  const [copied, setCopied] = useState(false);

  if (!molecule?.id) return null;
  const url = shared ? `${window.location.origin}${shared.share_url || `/m/${shared.share_token}`}` : '';

  const share = async () => setShared(await collaboration.shareMolecule(molecule.id, !shared?.is_public));
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:border-emerald-400/50">
        <Share2 size={16} /> {shared?.is_public ? 'Public' : 'Share'}
      </button>
      {shared?.is_public && (
        <div className="absolute right-0 top-12 z-20 w-72 rounded-lg border border-white/10 bg-[#15151f] p-4 shadow-2xl">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-400"><Eye size={14} /> {shared.view_count || 0} views</div>
          <div className="mx-auto mb-3 w-fit rounded-md bg-white p-2"><QRCodeSVG value={url} size={112} /></div>
          <div className="flex gap-2"><input readOnly value={url} className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-2 text-xs text-slate-300" /><button type="button" onClick={copy} className="grid h-9 w-9 place-items-center rounded-md bg-indigo-500 text-white" title="Copy share link">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
        </div>
      )}
    </div>
  );
}
