'use client';

import { useAuth } from '@/context/AuthContext';

/**
 * Simple user badge — replaces the problematic 3D Lanyard badge
 * that crashed the build via troika-three-text ESM import errors.
 */
export default function AuthLanyardBadge() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';

  return (
    <div className="fixed bottom-4 right-4 z-[60] hidden lg:flex items-center gap-3 bg-surface border border-border rounded-md px-4 py-2.5 shadow-lg">
      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
        {user.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-primary">{name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground truncate max-w-[120px]">{name}</div>
        <div className="text-[10px] text-muted truncate max-w-[120px]">{user.email}</div>
      </div>
    </div>
  );
}
