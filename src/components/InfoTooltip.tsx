interface InfoTooltipProps {
  text: string;
  tone?: 'blue' | 'gray' | 'red';
  size?: 'normal' | 'small';
}

const toneClasses = {
  blue: 'border-blue-300 bg-blue-50 text-blue-700 focus:ring-blue-400',
  gray: 'border-gray-300 bg-gray-50 text-gray-600 focus:ring-gray-300',
  red: 'border-red-300 bg-red-50 text-red-600 focus:ring-red-300',
};

const sizeClasses = {
  normal: 'h-4 w-4 text-[10px]',
  small: 'h-3.5 w-3.5 text-[9px]',
};

const tooltipToneClasses = {
  blue: 'bg-gray-900 text-white',
  gray: 'bg-gray-700 text-white',
  red: 'bg-red-700 text-white',
};

const tooltipSizeClasses = {
  normal: 'max-w-56 px-2.5 py-1.5 text-xs',
  small: 'max-w-48 px-2 py-1 text-[11px]',
};

export default function InfoTooltip({ text, tone = 'blue', size = 'normal' }: InfoTooltipProps) {
  return (
    <span className="relative inline-flex group align-middle">
      <button
        type="button"
        aria-label={text}
        className={`inline-flex items-center justify-center rounded-full border font-bold leading-none focus:outline-none focus:ring-2 ${toneClasses[tone]} ${sizeClasses[size]}`}
      >
        i
      </button>
      <span className={`pointer-events-none absolute bottom-full left-1/2 z-[2000] mb-2 hidden w-max -translate-x-1/2 rounded font-normal leading-snug shadow-lg group-hover:block group-focus-within:block ${tooltipToneClasses[tone]} ${tooltipSizeClasses[size]}`}>
        {text}
      </span>
    </span>
  );
}
