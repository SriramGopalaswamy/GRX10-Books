import React from 'react';
import logoSvg from '../assets/grx10-logo.svg';

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
      <img
        src={logoSvg}
        alt="GRX10 logo mark"
        className={className}
        style={{ width: s.height, height: s.height }}
      />
    );
  }

  if (variant === 'text') {
    return (
      <img
        src={logoSvg}
        alt="GRX10"
        className={className}
        style={{ height: s.height, width: s.width }}
      />
    );
  }

  // Full logo: icon mark + text
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-label="GRX10 Financial Suite" role="img">
      <img
        src={logoSvg}
        alt="GRX10"
        style={{ width: s.width, height: s.height }}
      />
      <span
        className="text-grx-primary-100 uppercase tracking-[0.24em]"
        style={{ fontSize: s.subSize }}
      >
        Financial Suite
      </span>
    </div>
  );
};
