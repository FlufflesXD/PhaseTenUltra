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
  isNumberEyeActive?: boolean;
  isColorEyeActive?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isSelected = false,
  isHighlighted = false,
  isSelectable = true,
  size = 'md',
  onClick,
  badge,
  isNumberEyeActive = false,
  isColorEyeActive = false
}) => {
  const [imageError, setImageError] = React.useState(false);

  const sizeClasses = {
    xs: 'w-[48px] h-[67px] aspect-[5/7] text-[10px]',
    sm: 'w-[72px] h-[100px] aspect-[5/7] text-xs',
    md: 'w-[105px] h-[147px] aspect-[5/7] text-sm',
    lg: 'w-[115px] h-[161px] aspect-[5/7] text-base'
  }[size];

  // Inverted styling when selected
  const baseStyle = isSelected
    ? 'bg-white text-black border-2 border-white font-bold'
    : 'bg-black text-white border border-neutral-600 hover:border-white';

  const highlightStyle = isHighlighted && !isSelected ? 'ring-2 ring-white' : '';

  const colorLabel = isColorEyeActive && card.type === 'number' ? 'GREY' : (card.color !== 'none' ? card.color.toUpperCase() : '');

  const imageSrc = React.useMemo(() => {
    if (card.type === 'wild') return '/cards/wild.png';
    if (card.type === 'skip') return '/cards/skip.png';
    if (card.type === 'reverse') return '/cards/reverse.png';
    if (card.type === 'draw_two' || card.type === 'plus_two') return '/cards/custom/plus_two.png';
    if (card.type === 'plus_three') return '/cards/custom/plus_three.png';
    if (card.type === 'nuke') return '/cards/custom/nuke.png';
    if (card.type === 'jester') return '/cards/custom/jester.png';
    if (card.type === 'redo') return '/cards/custom/redo.png';
    if (card.type === 'time') return '/cards/custom/time.png';
    if (card.type === 'number_eye') return '/cards/custom/number_eye.png';
    if (card.type === 'color_eye') return '/cards/custom/color_eye.png';
    if (card.type === 'random') return '/cards/custom/random.png';
    if (card.type === 'number') {
      if (isNumberEyeActive) {
        return `/cards/custom/number_eye/${card.color}_unknown.png`;
      }
      return `/cards/${card.color}_${card.value}.png`;
    }
    return null;
  }, [card.type, card.color, card.value, isNumberEyeActive]);

  React.useEffect(() => {
    setImageError(false);
  }, [card.id, card.type, card.color, card.value, isNumberEyeActive, isColorEyeActive]);

  const symbol =
    card.type === 'wild'
      ? 'W'
      : card.type === 'skip'
      ? 'S'
      : card.type === 'reverse'
      ? '⇄'
      : card.type === 'draw_two' || card.type === 'plus_two'
      ? '+2'
      : card.type === 'plus_three'
      ? '+3'
      : card.type === 'nuke'
      ? '☢'
      : card.type === 'jester'
      ? '🃏'
      : card.type === 'redo'
      ? '🔄'
      : card.type === 'time'
      ? '⏳'
      : card.type === 'number_eye'
      ? '👁'
      : card.type === 'color_eye'
      ? '👁'
      : card.type === 'random'
      ? '🎲'
      : isNumberEyeActive
      ? '?'
      : card.value;

  const innerContent = imageSrc && !imageError ? (
    <>
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded">
        <img
          src={imageSrc}
          alt={`${card.color} ${card.value || card.type}`}
          onError={() => setImageError(true)}
          className={`w-full h-full object-contain pointer-events-none rounded transition-all ${
            isColorEyeActive && card.type === 'number' ? 'grayscale contrast-125' : ''
          }`}
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
        {(card.type === 'draw_two' || card.type === 'plus_two') && <div className="text-sm sm:text-base tracking-wider">+2 DRAW</div>}
        {card.type === 'plus_three' && <div className="text-sm sm:text-base tracking-wider">+3 DRAW</div>}
        {card.type === 'nuke' && <div className="text-sm sm:text-base tracking-wider text-red-500 font-black">☢ NUKE</div>}
        {card.type === 'jester' && <div className="text-sm sm:text-base tracking-wider text-purple-400 font-black">🃏 JESTER</div>}
        {card.type === 'redo' && <div className="text-sm sm:text-base tracking-wider text-pink-400 font-black">🔄 REDO</div>}
        {card.type === 'time' && <div className="text-sm sm:text-base tracking-wider text-emerald-400 font-black">⏳ TIME</div>}
        {card.type === 'number_eye' && <div className="text-sm sm:text-base tracking-wider text-amber-400 font-black">👁 NUM EYE</div>}
        {card.type === 'color_eye' && <div className="text-sm sm:text-base tracking-wider text-neutral-400 font-black">👁 COLOR EYE</div>}
        {card.type === 'random' && <div className="text-sm sm:text-base tracking-wider text-cyan-400 font-black">🎲 RANDOM</div>}
        {card.type === 'number' && (
          <div>
            <div className="text-xl sm:text-3xl leading-none">{isNumberEyeActive ? '?' : card.value}</div>
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
