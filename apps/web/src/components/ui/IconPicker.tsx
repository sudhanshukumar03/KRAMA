import { useState, useRef, useEffect } from "react";
import { resolveIcon, ICON_CATEGORIES } from "../../lib/iconResolver";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

interface IconPickerProps {
  id?: string;
  value?: string | null;
  onChange: (iconKey: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function IconPicker({
  id,
  value,
  onChange,
  className = "",
  triggerClassName = "",
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const CurrentIcon = resolveIcon(value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredCategories = Object.entries(ICON_CATEGORIES)
    .map(([category, icons]) => {
      const filteredIcons = icons.filter((icon) =>
        icon.toLowerCase().includes(search.toLowerCase()),
      );
      return { category, icons: filteredIcons };
    })
    .filter((c) => c.icons.length > 0);

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center rounded-lg border border-border hover:border-accent/40 transition-colors bg-surface text-secondary hover:text-primary shadow-2xs cursor-pointer",
          triggerClassName || "w-10 h-10 p-2"
        )}
        aria-label="Pick an icon"
        title="Choose icon"
      >
        <CurrentIcon className="w-4 h-4 stroke-[1.75]" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-xl shadow-black/15 p-3 right-0 sm:left-0 sm:right-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-secondary stroke-[1.75]" />
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-primary placeholder:text-secondary/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-sans"
              autoFocus
            />
          </div>

          <div className="space-y-3.5">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(({ category, icons }) => (
                <div key={category}>
                  <h4 className="text-[10px] font-mono font-bold text-secondary mb-1.5 uppercase tracking-wider">
                    {category}
                  </h4>
                  <div className="grid grid-cols-6 gap-1">
                    {icons.map((iconKey) => {
                      const IconComp = resolveIcon(iconKey);
                      const isSelected = value === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => {
                            onChange(iconKey);
                            setIsOpen(false);
                            setSearch("");
                          }}
                          className={cn(
                            "p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                            isSelected
                              ? "bg-accent-subtle text-accent-fg border border-accent/40 shadow-2xs font-semibold"
                              : "hover:bg-surface-hover text-secondary hover:text-primary hover:scale-105"
                          )}
                          title={iconKey}
                        >
                          <IconComp className="w-4 h-4 stroke-[1.75]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-secondary font-mono">
                No icons found for "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
