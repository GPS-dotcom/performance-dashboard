export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selectLabel?: string;
  selectValue?: string;
  selectOptions?: FilterOption[];
  onSelectChange?: (value: string) => void;
}

/** COMPONENT_LIBRARY.md's "Filters" primitive -- a search box plus one optional select, shared by every page that filters a list (Activities today; History/Laboratory in the next phase). */
export function FilterBar({ searchValue, onSearchChange, searchPlaceholder = "Search…", selectLabel, selectValue, selectOptions, onSelectChange }: FilterBarProps) {
  return (
    <div className="dash-filter-bar" role="search">
      <input
        type="search"
        className="dash-filter-search"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
      />
      {selectOptions && onSelectChange && (
        <label className="dash-filter-select-label">
          {selectLabel}
          <select className="dash-filter-select" value={selectValue} onChange={(e) => onSelectChange(e.target.value)}>
            {selectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
