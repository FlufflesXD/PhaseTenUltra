import React from 'react';
import { Card, isUltimateCard } from '@phase-ten/shared';

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
  const baseStyle = isColorEyeActive && card.type === 'number'
    ? (isSelected
        ? 'bg-neutral-300 text-black border-2 border-white font-bold'
        : 'bg-neutral-800 text-neutral-200 border border-neutral-600 hover:border-white')
    : isSelected
    ? 'bg-white text-black border-2 border-white font-bold'
    : 'bg-black text-white border border-neutral-600 hover:border-white';

  const highlightStyle = isHighlighted && !isSelected ? 'ring-2 ring-white' : '';
  const ultimateGlow = isUltimateCard(card.type)
    ? (card.ultimateProgress === 100
        ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
        : 'border-purple-500/70 shadow-[0_0_8px_rgba(168,85,247,0.3)]')
    : '';

  const colorLabel = isColorEyeActive && card.type === 'number' ? 'GREY' : (card.color !== 'none' ? card.color.toUpperCase() : '');

  const imageSrc = React.useMemo(() => {
    if (isUltimateCard(card.type)) {
      return `/cards/custom_ultimates/${card.type}.webp`;
    }
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
    if (card.type === 'crack') return '/cards/custom/crack.png';
    if (card.type === 'status') return '/cards/custom/status.png';
    if (card.type === 'luck') return '/cards/custom/luck.png';
    if (card.type === 'unlucky') return '/cards/custom/unlucky.png';
    if (card.type === 'double') return '/cards/custom/double.png';
    if (card.type === 'number') {
      if (isNumberEyeActive && isColorEyeActive) {
        return '/cards/custom/color_eye/grey_unknown.png';
      }
      if (isNumberEyeActive) {
        return `/cards/custom/number_eye/${card.color}_unknown.png`;
      }
      if (isColorEyeActive) {
        return `/cards/custom/color_eye/grey_${card.value}.png`;
      }
      return `/cards/${card.color}_${card.value}.png`;
    }
    return null;
  }, [card.type, card.color, card.value, isNumberEyeActive, isColorEyeActive]);

  React.useEffect(() => {
    setImageError(false);
  }, [card.id, card.type, card.color, card.value, card.isCracked, card.ultimateProgress, isNumberEyeActive, isColorEyeActive]);

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
      ? 'NUKE'
      : card.type === 'jester'
      ? 'JEST'
      : card.type === 'redo'
      ? 'REDO'
      : card.type === 'time'
      ? 'TIME'
      : card.type === 'number_eye'
      ? '#EYE'
      : card.type === 'color_eye'
      ? 'CEYE'
      : card.type === 'random'
      ? 'RND'
      : card.type === 'crack'
      ? 'CRCK'
      : card.type === 'status'
      ? 'STAT'
      : card.type === 'luck'
      ? 'LUCK'
      : card.type === 'unlucky'
      ? 'CURS'
      : card.type === 'double'
      ? '2X'
      : isNumberEyeActive
      ? '?'
      : card.value;

  const isUlt = isUltimateCard(card.type);

  const innerContent = imageSrc && !imageError ? (
    <>
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded">
        <img
          src={imageSrc}
          alt={`${card.color} ${card.value || card.type}`}
          onError={() => setImageError(true)}
          className={`w-full h-full pointer-events-none rounded transition-all ${
            isUlt ? 'object-cover' : 'object-contain'
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
        {card.type === 'nuke' && <div className="text-sm sm:text-base tracking-wider text-red-500 font-black">NUKE</div>}
        {card.type === 'jester' && <div className="text-sm sm:text-base tracking-wider text-purple-400 font-black">JESTER</div>}
        {card.type === 'redo' && <div className="text-sm sm:text-base tracking-wider text-pink-400 font-black">REDO</div>}
        {card.type === 'time' && <div className="text-sm sm:text-base tracking-wider text-emerald-400 font-black">TIME</div>}
        {card.type === 'number_eye' && <div className="text-sm sm:text-base tracking-wider text-amber-400 font-black">NUM EYE</div>}
        {card.type === 'color_eye' && <div className="text-sm sm:text-base tracking-wider text-neutral-400 font-black">COLOR EYE</div>}
        {card.type === 'random' && <div className="text-sm sm:text-base tracking-wider text-cyan-400 font-black">RANDOM</div>}
        {card.type === 'crack' && <div className="text-sm sm:text-base tracking-wider text-stone-400 font-black">CRACK</div>}
        {card.type === 'status' && <div className="text-sm sm:text-base tracking-wider text-teal-300 font-black">STATUS</div>}
        {card.type === 'luck' && <div className="text-sm sm:text-base tracking-wider text-green-400 font-black">LUCK</div>}
        {card.type === 'unlucky' && <div className="text-sm sm:text-base tracking-wider text-red-500 font-black">UNLUCKY</div>}
        {card.type === 'double' && <div className="text-sm sm:text-base tracking-wider text-purple-400 font-black">DOUBLE</div>}
        {card.type === 'singularity' && <div className="text-xs sm:text-sm tracking-wider text-purple-400 font-black">SINGULARITY</div>}
        {card.type === 'voyance' && <div className="text-xs sm:text-sm tracking-wider text-indigo-400 font-black">VOYANCE</div>}
        {card.type === 'alternate' && <div className="text-xs sm:text-sm tracking-wider text-cyan-400 font-black">ALTERNATE</div>}
        {card.type === 'avarice' && <div className="text-xs sm:text-sm tracking-wider text-amber-400 font-black">AVARICE</div>}
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

  const ultimateProgressBar = isUlt ? (
    <div className="absolute bottom-1 left-1 right-1 z-30 flex flex-col items-center pointer-events-none">
      <div className="w-full bg-black/85 backdrop-blur-sm border border-amber-500/60 rounded px-1 py-0.5 shadow-lg">
        <div className="flex justify-between items-center text-[8px] font-black tracking-wider uppercase leading-tight mb-0.5">
          <span className={card.ultimateProgress === 100 ? 'text-amber-300 animate-pulse font-bold' : 'text-neutral-300'}>
            {card.ultimateProgress === 100 ? 'READY' : `${card.ultimateProgress ?? 0}%`}
          </span>
          <span className="text-[7px] text-neutral-400">ULT</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700">
          <div
            className={`h-full transition-all duration-300 ${
              card.ultimateProgress === 100
                ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                : card.ultimateProgress === 50
                ? 'bg-gradient-to-r from-blue-400 to-cyan-300'
                : 'bg-neutral-600'
            }`}
            style={{ width: `${card.ultimateProgress ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  ) : null;

  const crackedOverlay = card.isCracked ? (
    <div className="absolute inset-0 pointer-events-none rounded z-20 flex items-center justify-center overflow-hidden">
      <img
        src="/cards/custom/crack/cracks.png"
        alt="Cracked"
        className="w-full h-full object-cover pointer-events-none select-none"
      />
    </div>
  ) : null;

  const motionStyle = isSelected
    ? '-translate-y-3.5 shadow-xl shadow-white/20'
    : 'hover:-translate-y-1.5 hover:shadow-md';

  if (!isSelectable) {
    return (
      <div
        className={`relative ${sizeClasses} rounded p-1 flex flex-col justify-between select-none pointer-events-none ${baseStyle} ${highlightStyle} ${ultimateGlow}`}
      >
        {innerContent}
        {crackedOverlay}
        {ultimateProgressBar}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative ${sizeClasses} rounded p-1 flex flex-col justify-between select-none transition-all duration-150 transform cursor-pointer ${baseStyle} ${highlightStyle} ${ultimateGlow} ${motionStyle}`}
    >
      {innerContent}
      {crackedOverlay}
      {ultimateProgressBar}
    </button>
  );
};
