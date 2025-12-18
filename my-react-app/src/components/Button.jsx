import React from 'react';

export default function Button({
  as = 'button',
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const Comp = as;

  // 基礎互動樣式
  const base =
    'inline-flex items-center justify-center font-bold select-none ' +
    'transition-all duration-200 ' +
    'focus:outline-none focus-visible:ring-4 ' +
    'active:scale-[0.97] ' +
    'disabled:opacity-50 disabled:pointer-events-none ' +
    '[&]:appearance-none ' +
    '[-webkit-tap-highlight-color:transparent]';

  // 顏色主題 (使用 !important 確保權重)
  const variants = {
    primary:
      '!bg-teal-600 !text-white hover:!bg-teal-700 focus-visible:ring-teal-500/30 shadow-md',
    secondary:
      '!bg-teal-800 !text-white hover:!bg-teal-900 focus-visible:ring-teal-700/30 shadow-md',
    outline:
      '!bg-teal-100 !text-teal-900 border-2 !border-teal-200 hover:!bg-teal-200 hover:!border-teal-300 shadow-sm',
    danger:
      '!bg-red-600 !text-white hover:!bg-red-700 focus-visible:ring-red-500/30',
    ghost:
      'bg-transparent text-teal-700 hover:bg-teal-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-base rounded-xl',
    lg: 'px-6 py-4 text-lg rounded-2xl',
  };

  const combinedClassName = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <Comp
      type={Comp === 'button' ? type : undefined}
      disabled={disabled}
      className={combinedClassName}
      {...props}
    >
      {children}
    </Comp>
  );
}