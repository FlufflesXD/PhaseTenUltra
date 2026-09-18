import React from 'react';
import { Card } from '@phase-ten/shared';

interface CardViewProps {
  card: Card;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isSelectable?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
    xs: 'w-9 h-13 sm:w-10 sm:h-14 max-h-[8vh] aspect-[5/7] text-[9px]',
    sm: 'w-11 h-15 sm:w-13 sm:h-18 max-h-[10vh] aspect-[5/7] text-[10px] sm:text-xs',
    md: 'w-18 h-26 sm:w-22 sm:h-30 md:w-24 md:h-32 max-h-[16vh] aspect-[5/7] text-xs sm:text-sm',
    lg: 'w-18 h-26 sm:w-22 sm:h-30 md:w-26 md:h-36 max-h-[20vh] aspect-[5/7] text-xs sm:text-sm md:text-base'
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
