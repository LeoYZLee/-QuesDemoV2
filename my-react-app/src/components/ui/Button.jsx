import React from 'react';

const Button = ({ children, onClick, className = '', variant = 'primary', size = 'md', disabled = false, title = '' }) => {
  const baseStyle = 'inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700',
    secondary: 'bg-white text-teal-700 border-2 border-teal-100 hover:bg-teal-50',
    outline: 'bg-transparent border-2 border-teal-200 text-teal-600 hover:bg-teal-50',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
  };
  const sizes = {
    xs: 'px-2 py-1 text-xs rounded',
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-xl',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
};

export default Button;
