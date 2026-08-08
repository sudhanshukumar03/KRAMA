import { useState, useRef, useEffect } from "react";
import { resolveIcon, ICON_CATEGORIES } from "../../lib/iconResolver";
import { Search } from "lucide-react";

interface IconPickerProps {
  value?: string | null;
  onChange: (iconKey: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function IconPicker({
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
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center p-2 rounded-md border border-secondary/20 hover:border-secondary/40 transition-colors bg-surface ${triggerClassName}`}
        aria-label="Pick an icon"
      >
        <CurrentIcon className="w-5 h-5 text-body" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 max-h-96 overflow-y-auto bg-surface border border-secondary/20 rounded-lg shadow-xl shadow-black/10 p-3 right-0 sm:left-0 sm:right-auto">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-secondary" />
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-secondary/20 rounded-md py-1.5 pl-8 pr-3 text-sm text-body placeholder:text-secondary focus:outline-none focus:border-primary/50"
              autoFocus
            />
          </div>

          <div className="space-y-4">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(({ category, icons }) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-secondary mb-2 uppercase tracking-wider">
                    {category}
                  </h4>
                  <div className="grid grid-cols-6 gap-1">
                    {icons.map((iconKey) => {
                      const IconComp = resolveIcon(iconKey);
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => {
                            onChange(iconKey);
                            setIsOpen(false);
                            setSearch("");
                          }}
                          className={`p-2 rounded-md flex items-center justify-center transition-colors ${
                            value === iconKey
                              ? "bg-primary/20 text-primary"
                              : "hover:bg-secondary/10 text-body"
                          }`}
                          title={iconKey}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-secondary">
                No icons found for "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
