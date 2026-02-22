"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiStar, FiHash } from "react-icons/fi";

interface BrandSuggestion {
  brand: string;
  category: string;
  count: number;
  avgRating: number | null;
}

interface BrandAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  category: string;
  placeholder?: string;
  required?: boolean;
}

export function BrandAutocomplete({
  value,
  onChange,
  category,
  placeholder = "Enter brand name",
  required = false,
}: BrandAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<BrandSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions when value changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: value,
          category,
          limit: "8",
        });
        const res = await fetch(`/api/brands?${params}`);
        const data = await res.json() as { brands: BrandSuggestion[] };
        setSuggestions(data.brands || []);
        setIsOpen(focused && (data.brands || []).length > 0);
      } catch (error) {
        console.error("Failed to fetch brand suggestions:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200); // 200ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, category, focused]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (brand: string) => {
    onChange(brand);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setFocused(true);
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Small delay to allow click on suggestion
    setTimeout(() => {
      setFocused(false);
      setIsOpen(false);
    }, 150);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
      />
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full"
          />
        </div>
      )}

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-[#252525] border border-white/10 rounded-xl overflow-hidden shadow-xl"
          >
            <div className="max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.brand}-${index}`}
                  type="button"
                  onClick={() => handleSelect(suggestion.brand)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{suggestion.brand}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <FiHash size={10} />
                        {suggestion.count} check-in{suggestion.count !== 1 ? "s" : ""}
                      </span>
                      {suggestion.avgRating && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <FiStar size={10} fill="currentColor" />
                          {suggestion.avgRating}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* "New brand" hint */}
            {value.trim() && !suggestions.some(s => s.brand.toLowerCase() === value.toLowerCase()) && (
              <div className="px-4 py-2 bg-white/5 text-xs text-gray-400 border-t border-white/10">
                Press enter to add &quot;{value}&quot; as a new brand
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
