import { SearchIcon } from './icons';

/** The search panel, written into every page and opened by the header's button once the script has wired it. */
export function SearchDialog() {
  return (
    <dialog className="search-dialog" aria-label="Search the site" data-search-dialog>
      <div className="search-field">
        <SearchIcon />
        <input
          type="search"
          className="search-input"
          placeholder="Search this site"
          aria-label="Search this site"
          role="combobox"
          aria-expanded="false"
          aria-controls="search-results"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          data-search-input
        />
        <kbd>Esc</kbd>
      </div>
      <div className="search-results" role="listbox" id="search-results" aria-label="Results" data-search-results />
      <p className="search-message" data-search-message>
        Type to search the demos, the comparison and the changelog.
      </p>
    </dialog>
  );
}
