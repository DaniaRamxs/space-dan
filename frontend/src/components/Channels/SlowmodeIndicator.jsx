import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function SlowmodeIndicator({ channelId, userId }) {
  const [slowmode, setSlowmode] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (channelId) {
      loadSlowmode();
    }
  }, [channelId]);

  useEffect(() => {
    if (remaining > 0) {
      const timer = setInterval(() => {
        setRemaining(r => Math.max(0, r - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [remaining]);

  const loadSlowmode = async () => {
    try {
      const { data, error } = await supabase
        .from('community_channels')
        .select('slowmode_delay')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      setSlowmode(data?.slowmode_delay || 0);
      
      // Check remaining time for user
      if (userId && data?.slowmode_delay > 0) {
        const { data: rateData } = await supabase
          .from('user_message_rate')
          .select('last_message_at')
          .eq('channel_id', channelId)
          .eq('user_id', userId)
          .single();
        
        if (rateData) {
          const lastMsg = new Date(rateData.last_message_at);
          const elapsed = (Date.now() - lastMsg.getTime()) / 1000;
          const remaining = Math.max(0, data.slowmode_delay - elapsed);
          setRemaining(Math.ceil(remaining));
        }
      }
    } catch (err) {
      console.error('[Slowmode] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || slowmode === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
      <Clock size={12} />
      <span>Slowmode: {slowmode}s</span>
      {remaining > 0 && (
        <span className="text-red-400 flex items-center gap-1">
          <AlertCircle size={10} />
          Espera {remaining}s
        </span>
      )}
    </div>
  );
}

// Hook para verificar si el usuario puede enviar mensaje
export function useSlowmodeCheck(channelId, userId) {
  const [canSend, setCanSend] = useState(true);
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    const check = async () => {
      if (!channelId || !userId) return;
      
      const { data, error } = await supabase
        .rpc('check_slowmode', { p_channel_id: channelId, p_user_id: userId });
      
      if (data) {
        setCanSend(data.allowed);
        setRetryAfter(data.retry_after || 0);
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [channelId, userId]);

  return { canSend, retryAfter };
}
