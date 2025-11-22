import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function DropdownSelect({
  label,
  options = [],
  value,
  onChange,
  error,
  placeholder = 'Select an option',
  required = false,
  className = '',
  optionLabel = 'label',
  optionValue = 'value',
  maxHeight = '200px',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => {
    const optValue = typeof opt === 'object' ? opt[optionValue] : opt;
    return optValue === value;
  });

  const displayValue = selectedOption
    ? typeof selectedOption === 'object'
      ? selectedOption[optionLabel]
      : selectedOption
    : '';

  const handleSelect = (option) => {
    const optValue = typeof option === 'object' ? option[optionValue] : option;
    onChange(optValue);
    setIsOpen(false);
  };

  // Calculate dropdown position to prevent overflow
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 200; // approximate height

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
        setDropdownStyle({ bottom: '100%', marginBottom: '4px' });
      } else {
        setDropdownPosition('bottom');
        setDropdownStyle({ top: '100%', marginTop: '4px' });
      }
    }
  }, [isOpen]);

  return (
    <div className={`w-full relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-md border ${
          error ? 'border-rose-500' : 'border-white/10'
        } bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30 flex items-center justify-between transition-colors hover:bg-white/10`}
      >
        <span className={displayValue ? 'text-slate-200' : 'text-slate-400'}>
          {displayValue || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 rounded-lg border border-white/10 bg-slate-900 shadow-lg ${
            dropdownPosition === 'top' ? 'bottom-full' : 'top-full'
          }`}
          style={dropdownStyle}
        >
          <div
            className="overflow-y-auto"
            style={maxHeight ? { maxHeight } : {}}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400 text-center">
                No options available
              </div>
            ) : (
              options.map((option, index) => {
                const optValue = typeof option === 'object' ? option[optionValue] : option;
                const optLabel = typeof option === 'object' ? option[optionLabel] : option;
                const isSelected = optValue === value;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
                    }`}
                  >
                    <span>{optLabel}</span>
                    {isSelected && <Check className="h-4 w-4 text-indigo-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

