"use client";

export default function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
    </div>
  );
}