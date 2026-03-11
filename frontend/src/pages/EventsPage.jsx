import React, { useState, useEffect } from 'react';
import CosmicEventCard from '../components/Social/CosmicEventCard';
import MeteoriteEntrance from '../components/Effects/MeteoriteEntrance';
import { cosmicEventsService } from '../services/cosmicEventsService';
import { Star, Sparkles } from 'lucide-react';

/**
 * EventsPage: Vista dedicada para eventos cósmicos
 * Muestra solo eventos cósmicos (lluvia de meteoritos, supernova, etc.)
 */
export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    // Cargar eventos cósmicos
    const loadEvents = async () => {
      try {
        setLoading(true);
        const cosmicEvents = await cosmicEventsService.getUniverseEvents(50);
        if (mounted) {
          setEvents(cosmicEvents);
          
          // Buscar evento activo
          const active = await cosmicEventsService.getActiveEvent();
          if (mounted) setActiveEvent(active);
        }
      } catch (error) {
        console.error('[EventsPage] Error loading events:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadEvents();
    
    // Refrescar eventos cada 5 minutos
    const interval = setInterval(loadEvents, 5 * 60 * 1000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto min-h-screen pb-32 text-white font-sans flex flex-col pt-6 md:pt-10 px-4 md:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Eventos Cósmicos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full max-w-4xl mx-auto min-h-screen pb-32 text-white font-sans flex flex-col pt-6 md:pt-10 px-4 md:px-8">
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Star className="w-8 h-8 text-cyan-400" />
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Eventos Cósmicos
          </h1>
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <p className="text-white/60 text-sm">
          Fenómenos estelares que afectan el equilibrio del universo
        </p>
      </motion.div>

      {/* Evento Activo Banner */}
      {activeEvent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-black uppercase tracking-widest">Evento Activo</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{activeEvent.name}</h3>
            <p className="text-white/70 text-sm mb-3">{activeEvent.description}</p>
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span>Multiplicador: x{activeEvent.multiplier}</span>
              <span>Duración: {activeEvent.duration} min</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lista de Eventos */}
      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <MeteoriteEntrance>
                <CosmicEventCard event={event} />
              </MeteoriteEntrance>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 opacity-30">
            <Star className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <p className="text-[10px] uppercase tracking-[0.4em]">Sin eventos cósmicos recientes</p>
          </div>
        )}
      </div>

    </main>
  );
}
