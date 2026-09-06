import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Coins } from 'lucide-react';
import { CurrencyCode, SUPPORTED_CURRENCIES, getCurrencyConfig } from '../utils/currency';

interface CurrencySelectorProps {
  currentCurrency: CurrencyCode;
  onCurrencyChange: (newCurrency: CurrencyCode) => void;
  variant?: 'compact' | 'full';
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currentCurrency,
  onCurrencyChange,
  variant = 'compact',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConfig = getCurrencyConfig(currentCurrency);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: CurrencyCode) => {
    onCurrencyChange(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        id="btn-currency-selector"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
          isOpen
            ? 'bg-slate-800 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-md'
            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200 hover:text-white'
        }`}
        title={`Active Currency: ${activeConfig.name} (${activeConfig.symbol}). Click to change.`}
      >
        <span className="text-sm leading-none" role="img" aria-label={activeConfig.country}>
          {activeConfig.flag}
        </span>
        <span className="text-xs font-bold text-slate-100">{activeConfig.code}</span>
        <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
          ({activeConfig.symbol})
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-slate-900 border border-slate-700/90 shadow-2xl z-50 py-1.5 focus:outline-none animate-fadeIn">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-indigo-400" />
              Select Currency
            </span>
            <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              Default: MYR
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin">
            {SUPPORTED_CURRENCIES.map((curr) => {
              const isSelected = curr.code === currentCurrency;
              const isDefault = curr.code === 'MYR';

              return (
                <button
                  key={curr.code}
                  type="button"
                  id={`currency-opt-${curr.code}`}
                  onClick={() => handleSelect(curr.code)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base leading-none" role="img" aria-label={curr.country}>
                      {curr.flag}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{curr.code}</span>
                        <span className="text-slate-400">({curr.symbol})</span>
                        {isDefault && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{curr.name}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-slate-800 text-[10px] text-slate-400 leading-snug">
            All amounts, schedules, float metrics, and AI recommendations will instantly update.
          </div>
        </div>
      )}
    </div>
  );
};
