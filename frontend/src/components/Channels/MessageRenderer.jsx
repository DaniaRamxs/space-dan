/**
 * MessageRenderer.jsx
 * Renderiza mensajes con soporte para emojis custom :nombre:
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// Cache de emojis para no cargar repetidamente
const emojiCache = new Map();

export function useCustomEmojis(communityId) {
  const [emojis, setEmojis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!communityId) return;

    // Check cache
    if (emojiCache.has(communityId)) {
      setEmojis(emojiCache.get(communityId));
      setLoading(false);
      return;
    }

    const loadEmojis = async () => {
      try {
        const { data, error } = await supabase
          .from('community_emojis')
          .select('*')
          .eq('community_id', communityId)
          .eq('is_active', true);

        if (error) throw error;
        
        const emojiList = data || [];
        emojiCache.set(communityId, emojiList);
        setEmojis(emojiList);
      } catch (err) {
        console.error('[MessageRenderer] Error loading emojis:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEmojis();
  }, [communityId]);

  return { emojis, loading };
}

/**
 * Parsea el contenido del mensaje y reemplaza :emoji: con imágenes
 */
export function parseMessageContent(content, customEmojis = []) {
  if (!content) return [];

  // Crear un mapa de nombre -> emoji para búsqueda rápida
  const emojiMap = new Map(customEmojis.map(e => [e.name, e]));

  // Regex para encontrar :nombre: (letras, números, guiones, underscores)
  const emojiRegex = /:([a-zA-Z0-9_-]+):/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = emojiRegex.exec(content)) !== null) {
    const [fullMatch, emojiName] = match;
    const emoji = emojiMap.get(emojiName);

    // Texto antes del emoji
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }

    if (emoji) {
      // Emoji custom encontrado
      parts.push({
        type: 'emoji',
        name: emojiName,
        imageUrl: emoji.image_url,
        fullMatch
      });
    } else {
      // No es un emoji custom, dejar como texto
      parts.push({
        type: 'text',
        content: fullMatch
      });
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Texto restante después del último emoji
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  // Si no hay emojis, devolver el texto completo
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
}

/**
 * Componente para renderizar contenido de mensaje con emojis
 */
export default function MessageRenderer({ content, communityId }) {
  const { emojis } = useCustomEmojis(communityId);
  const parts = parseMessageContent(content, emojis);

  // Verificar si es una imagen markdown
  const imageMatch = content?.match(/!\[.*?\]\((.*?)\)/);
  if (imageMatch) {
    return (
      <img 
        src={imageMatch[1]} 
        alt="imagen" 
        className="max-w-sm rounded-lg mt-1 cursor-pointer hover:opacity-90 transition-opacity"
      />
    );
  }

  return (
    <p className="text-gray-200 whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.type === 'emoji') {
          return (
            <img
              key={`${part.name}-${index}`}
              src={part.imageUrl}
              alt={`:${part.name}:`}
              className="inline-block w-5 h-5 object-contain align-text-bottom mx-0.5"
              title={`:${part.name}:`}
            />
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </p>
  );
}

/**
 * Versión simple sin hooks (para usar en listas o donde no se puede usar el hook)
 * Recibe los emojis pre-cargados
 */
export function MessageRendererWithEmojis({ content, emojis = [] }) {
  const parts = parseMessageContent(content, emojis);

  // Verificar si es una imagen markdown
  const imageMatch = content?.match(/!\[.*?\]\((.*?)\)/);
  if (imageMatch) {
    return (
      <img 
        src={imageMatch[1]} 
        alt="imagen" 
        className="max-w-sm rounded-lg mt-1 cursor-pointer hover:opacity-90 transition-opacity"
      />
    );
  }

  return (
    <p className="text-gray-200 whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.type === 'emoji') {
          return (
            <img
              key={`${part.name}-${index}`}
              src={part.imageUrl}
              alt={`:${part.name}:`}
              className="inline-block w-5 h-5 object-contain align-text-bottom mx-0.5"
              title={`:${part.name}:`}
            />
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </p>
  );
}
