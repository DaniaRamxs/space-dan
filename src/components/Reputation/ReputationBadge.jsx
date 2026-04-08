import { getLevelBadge, getLevelColor, getLevelName } from '../../services/reputationService';

export default function ReputationBadge({ points, showBadge = true, showName = true, size = 'sm' }) {
  const badge = getLevelBadge(points || 0);
  const color = getLevelColor(points || 0);
  const name = getLevelName(points || 0);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`
      }}
      title={`${name} - ${points || 0} puntos`}
    >
      {showBadge && <span>{badge}</span>}
      {showName && <span>{name}</span>}
    </span>
  );
}
