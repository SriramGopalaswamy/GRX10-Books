import React from 'react';

interface GRX10LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark' | 'text';
  className?: string;
}

const sizes = {
  sm: { width: 80, height: 28, fontSize: 16, subSize: 8 },
  md: { width: 110, height: 36, fontSize: 22, subSize: 10 },
  lg: { width: 140, height: 44, fontSize: 28, subSize: 12 },
  xl: { width: 180, height: 56, fontSize: 36, subSize: 14 },
};

export const GRX10Logo: React.FC<GRX10LogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
}) => {
  const s = sizes[size];

  if (variant === 'mark') {
    return (
      <svg
        width={s.height}
        height={s.height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="GRX10 logo"
        role="img"
      >
        <rect width="40" height="40" rx="10" fill="#3A2F78" />
        <text
          x="50%"
          y="54%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="16"
        >
          G
        </text>
        <circle cx="32" cy="8" r="4" fill="#E6007E" />
      </svg>
    );
  }

  if (variant === 'text') {
    return (
      <span
        className={`font-bold tracking-tight ${className}`}
        style={{ fontSize: s.fontSize, color: '#3A2F78' }}
        aria-label="GRX10"
      >
        GRX<span style={{ color: '#E6007E' }}>10</span>
      </span>
    );
  }

  // Full logo: icon mark + text
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-label="GRX10 Financial Suite" role="img">
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="10" fill="#3A2F78" />
        <text
          x="50%"
          y="54%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="16"
        >
          G
        </text>
        <circle cx="32" cy="8" r="4" fill="#E6007E" />
      </svg>
      <div className="flex flex-col">
        <span
          className="font-bold tracking-tight leading-tight text-white"
          style={{ fontSize: s.fontSize }}
        >
          GRX<span style={{ color: '#E6007E' }}>10</span>
        </span>
        <span
          className="text-grx-primary-200 leading-tight"
          style={{ fontSize: s.subSize }}
        >
          Financial Suite
        </span>
      </div>
    </div>
  );
};
