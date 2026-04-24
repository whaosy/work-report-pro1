import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";

interface ComboboxOption {
  value: string | number;
  label: string;
  sub?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
}

export default function Combobox({ options, value, onChange, placeholder = "搜索或选择...", className = "", disabled = false, clearable = true }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sub && o.sub.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (opt: ComboboxOption) => {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex items-center border border-border bg-white px-3 py-2 cursor-pointer transition-colors ${open ? "border-foreground" : "hover:border-foreground/50"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => { if (!disabled) { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); } }}
      >
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={selected?.label ?? placeholder}
            className="flex-1 text-sm outline-none bg-transparent"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
            {selected?.label ?? placeholder}
          </span>
        )}
        <div className="flex items-center gap-1 ml-2">
          {clearable && value != null && !open && (
            <button onClick={handleClear} className="text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">无匹配结果</div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.value}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-secondary transition-colors ${opt.value === value ? "bg-primary/5 font-medium" : ""}`}
                onClick={() => handleSelect(opt)}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.sub && <span className="text-xs text-muted-foreground">{opt.sub}</span>}
                {opt.value === value && <Check size={12} className="text-primary flex-shrink-0" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
