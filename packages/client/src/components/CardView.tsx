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
  const sizeClasses = {
    sm: 'w-12 h-16 text-[10px]',
    md: 'w-16 h-24 sm:w-20 sm:h-28 text-xs',
    lg: 'w-20 h-28 sm:w-24 sm:h-34 text-sm'
  }[size];

  // Inverted styling when selected
  const baseStyle = isSelected
    ? 'bg-white text-black border-2 border-white font-bold'
    : 'bg-black text-white border border-neutral-600 hover:border-white';

  const highlightStyle = isHighlighted && !isSelected ? 'ring-2 ring-white' : '';

  const colorLabel = card.color !== 'none' ? card.color.toUpperCase() : '';

  return (
    <button
      type="button"
      onClick={isSelectable ? onClick : undefined}
      className={`relative ${sizeClasses} rounded p-1 flex flex-col justify-between select-none transition-all ${baseStyle} ${highlightStyle} ${
        isSelectable ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      {/* Top row */}
      <div className="flex justify-between items-center text-[9px] font-mono leading-none">
        <span>{card.type === 'wild' ? 'W' : card.type === 'skip' ? 'S' : card.value}</span>
        <span>{colorLabel.slice(0, 3)}</span>
      </div>

      {/* Center content */}
      <div className="my-auto text-center font-mono font-bold">
        {card.type === 'wild' && <div className="text-xs sm:text-sm tracking-wider">WILD</div>}
        {card.type === 'skip' && <div className="text-xs sm:text-sm tracking-wider">SKIP</div>}
        {card.type === 'number' && (
          <div>
            <div className="text-lg sm:text-2xl leading-none">{card.value}</div>
            <div className="text-[9px] tracking-wider opacity-75 mt-0.5">{colorLabel}</div>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex justify-between items-center text-[9px] font-mono leading-none rotate-180">
        <span>{card.type === 'wild' ? 'W' : card.type === 'skip' ? 'S' : card.value}</span>
        <span>{colorLabel.slice(0, 3)}</span>
      </div>

      {badge && (
        <span className="absolute -top-2 -right-1 bg-white text-black border border-black text-[9px] font-bold px-1 rounded">
          {badge}
        </span>
      )}
    </button>
  );
};
