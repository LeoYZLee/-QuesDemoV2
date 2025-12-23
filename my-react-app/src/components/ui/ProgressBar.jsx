import React from 'react';

const ProgressBar = ({ progress }) => {
  const width = Math.min(100, Math.max(0, progress));
  return (
    <div className="w-full h-1.5 bg-teal-100 rounded-full mb-4 overflow-hidden">
      <div
        className="h-full bg-orange-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

export default ProgressBar;
