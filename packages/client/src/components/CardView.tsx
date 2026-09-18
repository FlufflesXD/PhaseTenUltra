import React from 'react';
import { Card } from '@phase-ten/shared';

interface CardViewProps {
  card: Card;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isSelectable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  badge?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isSelected = false,
  isHighlighted = false,
  isSelectable = true,
  size = 'md',
  onClick,
  badge
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizeClasses = {
    sm: 'w-14 h-20 text-xs',
    md: 'w-20 h-28 sm:w-24 sm:h-34 text-sm',
    lg: 'w-24 h-34 sm:w-28 sm:h-40 md:w-32 md:h-44 text-base'
  }[size];

  // Inverted styling when selected
  const baseStyle = isSelected
    ? 'bg-white text-black border-2 border-white font-bold'
    : 'bg-black text-white border border-neutral-600 hover:border-white';

  const highlightStyle = isHighlighted && !isSelected ? 'ring-2 ring-white' : '';

  const colorLabel = card.color !== 'none' ? card.color.toUpperCase() : '';

  const imageSrc = React.useMemo(() => {
    if (card.type === 'wild') return '/cards/wild.png';
    if (card.type === 'skip') return '/cards/skip.png';
    if (card.type === 'reverse') return '/cards/reverse.png';
    if (card.type === 'draw_two') return '/cards/draw_two.png';
    if (card.type === 'number') return `/cards/${card.color}_${card.value}.png`;
    return null;
  }, [card.type, card.color, card.value]);

  React.useEffect(() => {
    setImageError(false);
  }, [card.id, card.type, card.color, card.value]);

  const symbol =
    card.type === 'wild'
      ? 'W'
      : card.type === 'skip'
      ? 'S'
      : card.type === 'reverse'
      ? '⇄'
      : card.type === 'draw_two'
      ? '+2'
      : card.value;

  const innerContent = imageSrc && !imageError ? (
    <>
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded">
        <img
          src={imageSrc}
          alt={`${card.color} ${card.value || card.type}`}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain pointer-events-none rounded"
        />
      </div>
      {badge && (
        <span className="absolute -top-2 -right-1 bg-white text-black border border-black text-[9px] font-bold px-1 rounded z-10 shadow">
          {badge}
        </span>
      )}
    </>
  ) : (
    <>
      {/* Top row */}
      <div className="flex justify-between items-center text-[10px] font-bold leading-none">
        <span>{symbol}</span>
        <span>{colorLabel.slice(0, 3)}</span>
      </div>

      {/* Center content */}
      <div className="my-auto text-center font-bold">
        {card.type === 'wild' && <div className="text-sm sm:text-base tracking-wider">WILD</div>}
        {card.type === 'skip' && <div className="text-sm sm:text-base tracking-wider">SKIP</div>}
        {card.type === 'reverse' && <div className="text-sm sm:text-base tracking-wider">REVERSE</div>}
        {card.type === 'draw_two' && <div className="text-sm sm:text-base tracking-wider">+2 DRAW</div>}
        {card.type === 'number' && (
          <div>
            <div className="text-xl sm:text-3xl leading-none">{card.value}</div>
            <div className="text-[10px] tracking-wider opacity-75 mt-0.5">{colorLabel}</div>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex justify-between items-center text-[10px] font-bold leading-none rotate-180">
        <span>{symbol}</span>
        <span>{colorLabel.slice(0, 3)}</span>
      </div>

      {badge && (
        <span className="absolute -top-2 -right-1 bg-white text-black border border-black text-[9px] font-bold px-1 rounded">
          {badge}
        </span>
      )}
    </>
  );

  const motionStyle = isSelected
    ? '-translate-y-3.5 shadow-xl shadow-white/20'
    : 'hover:-translate-y-1.5 hover:shadow-md';

  if (!isSelectable) {
    return (
      <div
        className={`relative ${sizeClasses} rounded p-1 flex flex-col justify-between select-none pointer-events-none ${baseStyle} ${highlightStyle}`}
      >
        {innerContent}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative ${sizeClasses} rounded p-1 flex flex-col justify-between select-none transition-all duration-150 transform cursor-pointer ${baseStyle} ${highlightStyle} ${motionStyle}`}
    >
      {innerContent}
    </button>
  );
};
