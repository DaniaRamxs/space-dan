import { useState, useEffect, useCallback } from 'react';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { communitiesService } from '../../services/communitiesService';
import { useUniverse } from '../../contexts/UniverseContext';
import { useAuthContext } from '../../contexts/AuthContext';
import CommunityPassportModal from './CommunityPassportModal';

export default function CommunityMemberList({ communityId, memberCount }) {
  const { user } = useAuthContext();
  const { onlineUsers } = useUniverse();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineOpen, setOnlineOpen] = useState(true);
  const [offlineOpen, setOfflineOpen] = useState(true);
  const [passportTarget, setPassportTarget] = useState(null); // { userId }

  const loadMembers = useCallback(async () => {
    if (!communityId) return;
    try {
      setLoading(true);
      const data = await communitiesService.getCommunityMembers(communityId, { limit: 100 });
      setMembers(Array.isArray(data) ? data : (data?.members ?? []));
    } catch (err) {
      console.error('[CommunityMemberList] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const getMemberId = (m) => m.user_id ?? m.id ?? m.profile?.id ?? m.profiles?.id;
  const online = members.filter(m => !!onlineUsers[getMemberId(m)]);
  const offline = members.filter(m => !onlineUsers[getMemberId(m)]);

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
            <div className="h-3 w-24 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
    <CommunityPassportModal
      userId={passportTarget?.userId}
      communityId={communityId}
      isOpen={!!passportTarget}
      onClose={() => setPassportTarget(null)}
      isOwnPassport={passportTarget?.userId === user?.id}
    />
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500">
          <Users size={12} />
          <span>Miembros — {memberCount ?? members.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Online */}
        {online.length > 0 && (
          <div>
            <button
              onClick={() => setOnlineOpen(v => !v)}
              className="w-full flex items-center gap-1 px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 hover:text-emerald-400 transition-colors"
            >
              {onlineOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              En línea — {online.length}
            </button>
            {onlineOpen && (
              <div className="mt-0.5 space-y-0.5">
                {online.map(m => (
                  <MemberRow
                    key={m.user_id ?? m.id}
                    member={m}
                    isOnline
                    onOpenPassport={(uid) => setPassportTarget({ userId: uid })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Offline */}
        {offline.length > 0 && (
          <div>
            <button
              onClick={() => setOfflineOpen(v => !v)}
              className="w-full flex items-center gap-1 px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
            >
              {offlineOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              Sin conexión — {offline.length}
            </button>
            {offlineOpen && (
              <div className="mt-0.5 space-y-0.5">
                {offline.map(m => (
                  <MemberRow
                    key={m.user_id ?? m.id}
                    member={m}
                    isOnline={false}
                    onOpenPassport={(uid) => setPassportTarget({ userId: uid })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {members.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4 italic">Sin miembros</p>
        )}
      </div>
    </div>
    </>
  );
}

function MemberRow({ member, isOnline, onOpenPassport }) {
  // el API puede devolver el perfil plano o anidado en member.profile / member.profiles
  const profile = member.profile ?? member.profiles ?? member;
  const username = profile.username ?? member.username ?? 'Piloto';
  const avatar =
    profile.avatar_url ??
    member.avatar_url ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  const profileId = member.user_id ?? member.id ?? profile.id;

  return (
    <button
      onClick={() => profileId && onOpenPassport(profileId)}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors group"
    >
      <div className="relative shrink-0">
        <img
          src={avatar}
          alt={username}
          className={`w-8 h-8 rounded-full object-cover ${isOnline ? '' : 'opacity-40'}`}
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a1a24] ${
            isOnline ? 'bg-emerald-400' : 'bg-gray-600'
          }`}
        />
      </div>
      <span
        className={`text-sm truncate text-left ${
          isOnline ? 'text-gray-200 group-hover:text-white' : 'text-gray-500'
        }`}
      >
        {username}
      </span>
    </button>
  );
}
