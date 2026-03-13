/**
 * MessageRenderer.jsx
 * Renderiza mensajes con soporte para emojis custom :nombre:
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

// Cache global de emojis
const globalEmojiCache = new Map();

export function useCustomEmojis(communityId) {
  const [emojis, setEmojis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!communityId) {
      setEmojis([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadEmojis = async () => {
      try {
        setLoading(true);
        
        // Always fetch fresh data - skip cache for reliability
        const { data, error } = await supabase
          .from('community_emojis')
          .select('*')
          .eq('community_id', communityId)
          .eq('is_active', true);

        if (error) throw error;
        
        const emojiList = data || [];
        globalEmojiCache.set(communityId, emojiList);
        
        if (!cancelled) {
          setEmojis(emojiList);
        }
      } catch (err) {
        console.error('[MessageRenderer] Error loading emojis:', err);
        if (!cancelled) {
          setEmojis([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEmojis();

    return () => {
      cancelled = true;
    };
  }, [communityId]);

  return { emojis, loading };
}

/**
 * Parsea el contenido del mensaje y reemplaza :emoji: con imágenes
 */
export function parseMessageContent(content, customEmojis = []) {
  if (!content) return [{ type: 'text', content: '' }];

  // Crear mapa de nombre -> emoji
  const emojiMap = new Map();
  for (const emoji of customEmojis) {
    if (emoji.name) {
      emojiMap.set(emoji.name.toLowerCase(), emoji);
    }
  }

  // Regex para :nombre: - soporta letras, números, guiones, underscores
  const emojiRegex = /:([a-zA-Z0-9_-]+):/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = emojiRegex.exec(content)) !== null) {
    const [fullMatch, emojiName] = match;
    const lowerName = emojiName.toLowerCase();
    const emoji = emojiMap.get(lowerName);

    // Texto antes del emoji
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      });
    }

    if (emoji && emoji.image_url) {
      // Emoji custom encontrado
      parts.push({
        type: 'emoji',
        name: emojiName,
        imageUrl: emoji.image_url,
        fullMatch
      });
    } else {
      // No es un emoji custom conocido, dejar como texto
      parts.push({
        type: 'text',
        content: fullMatch
      });
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Texto restante
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    });
  }

  // Si no hubo matches, devolver todo como texto
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
  
  // Parsear contenido con useMemo para optimizar
  const parts = useMemo(() => {
    return parseMessageContent(content, emojis);
  }, [content, emojis]);

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

  // Si no hay partes parseadas (contenido vacío o solo espacios)
  if (parts.length === 0 || (parts.length === 1 && !parts[0].content)) {
    return <p className="text-gray-200 whitespace-pre-wrap break-words">{content}</p>;
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
              loading="lazy"
              onError={(e) => {
                // Si falla la imagen, mostrar el texto
                e.target.style.display = 'none';
              }}
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
  const parts = useMemo(() => {
    return parseMessageContent(content, emojis);
  }, [content, emojis]);

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

  if (parts.length === 0 || (parts.length === 1 && !parts[0].content)) {
    return <p className="text-gray-200 whitespace-pre-wrap break-words">{content}</p>;
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
              loading="lazy"
            />
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </p>
  );
}
