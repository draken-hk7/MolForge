import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

export default function Signup() {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (auth.user) navigate('/profile');
    else auth.openAuth();
  }, [auth, navigate]);
  return <div className="py-16 text-center text-sm text-slate-400">Create an account to continue.</div>;
}
