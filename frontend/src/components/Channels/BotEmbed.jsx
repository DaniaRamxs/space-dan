/**
 * BotEmbed — renderiza mensajes de bot tipo Discord embed
 * Si content empieza con '{' intenta JSON.parse.
 * Si el objeto tiene type: 'embed', renderiza como embed card.
 * Si no, renderiza como texto plano.
 */

function StatBar({ label, value, text }) {
  // value -1 = mostrar estado "Durmiendo"
  // value -2 = mostrar texto directo (text prop)
  const getBarColor = (v) => {
    if (v > 60) return 'from-green-500 to-emerald-400';
    if (v >= 30) return 'from-yellow-500 to-amber-400';
    return 'from-red-500 to-rose-400';
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-400">{label}</span>
      {value === -1 ? (
        <span className="text-[11px] text-purple-400 italic">😴 Durmiendo</span>
      ) : value === -2 ? (
        <span className="text-[11px] text-gray-300">{text}</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${getBarColor(value)} transition-all`}
              style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 w-7 text-right">{value}%</span>
        </div>
      )}
    </div>
  );
}

function EmbedCard({ embed }) {
  const borderColor = embed.color || '#6366f1';

  return (
    <div
      className="max-w-md rounded-r-lg rounded-bl-lg bg-[#1a1a2e] p-3 mt-1"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Header: thumbnail + title */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {embed.title && (
            <p className="font-bold text-white text-sm leading-snug">{embed.title}</p>
          )}
          {embed.description && (
            <p className="text-gray-300 text-xs mt-1 italic leading-relaxed">{embed.description}</p>
          )}
        </div>
        {embed.thumbnail && (
          <img
            src={embed.thumbnail}
            alt="avatar"
            className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0"
          />
        )}
      </div>

      {/* Stats grid */}
      {embed.stats && embed.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
          {embed.stats.map((stat, i) => (
            <StatBar
              key={i}
              label={stat.label}
              value={stat.value}
              text={stat.text}
            />
          ))}
        </div>
      )}

      {/* Generic fields */}
      {embed.fields && embed.fields.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {embed.fields.map((field, i) => (
            <div
              key={i}
              className={field.inline === false ? 'col-span-2' : ''}
            >
              <p className="text-[11px] font-semibold text-gray-300">{field.name}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{field.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Meta line */}
      {embed.meta && (
        <p className="text-xs text-gray-500 mt-2">{embed.meta}</p>
      )}

      {/* Footer */}
      {embed.footer && (
        <p className="text-[10px] text-gray-600 mt-2 pt-2 border-t border-white/5">
          {embed.footer}
        </p>
      )}
    </div>
  );
}

export default function BotEmbed({ content }) {
  if (!content) return null;

  // Intentar parsear JSON si empieza con '{'
  if (typeof content === 'string' && content.trimStart().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.type === 'embed') {
        return <EmbedCard embed={parsed} />;
      }
    } catch {
      // No es JSON válido, caer a texto plano
    }
  }

  // Si ya es un objeto embed (pasado directamente, sin serializar)
  if (typeof content === 'object' && content !== null && content.type === 'embed') {
    return <EmbedCard embed={content} />;
  }

  // Texto plano
  return (
    <p className="text-gray-300 text-sm mt-1 leading-relaxed whitespace-pre-wrap break-words">
      {content}
    </p>
  );
}
