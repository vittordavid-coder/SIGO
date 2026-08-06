import React, { useState, useRef, useEffect, useMemo } from 'react';

export function InlineAutocomplete({
  options,
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  options: { label: string; value: string; searchStr?: string }[];
  value: string; // The ID
  onChange: (val: string) => void;
  onSelect: (val: string, label: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal query when value changes from outside
  useEffect(() => {
    const selectedOption = options.find(o => o.value === value);
    if (selectedOption) {
      setQuery(selectedOption.label);
    } else {
      setQuery('');
    }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query to the valid selected value if they click away
        const selectedOption = options.find(o => o.value === value);
        if (selectedOption) {
          setQuery(selectedOption.label);
        } else if (!value) {
          setQuery('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q) || o.searchStr?.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          onChange(''); // Clear the ID when they start searching
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900 px-3 focus:outline-none focus:border-indigo-500"
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {filtered.length > 0 ? (
            filtered.map(opt => (
              <div
                key={opt.value}
                className="px-3 py-2 text-xs text-gray-800 hover:bg-indigo-50 cursor-pointer font-medium border-b border-gray-50 last:border-0"
                onClick={() => {
                  setQuery(opt.label);
                  onSelect(opt.value, opt.label);
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500">Nenhum resultado...</div>
          )}
        </div>
      )}
    </div>
  );
}
