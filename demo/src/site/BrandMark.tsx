/** Three lines of type locked into their frame by a wedge, the printer's quoin the editor is named after. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect className="brand-frame" width="32" height="32" rx="8" />
      <rect className="brand-type" x="7" y="8" width="12" height="3.5" rx="1.25" />
      <rect className="brand-type" x="7" y="14.25" width="9" height="3.5" rx="1.25" />
      <rect className="brand-type" x="7" y="20.5" width="12" height="3.5" rx="1.25" />
      <path className="brand-wedge" d="M21 24 25 8v16Z" />
    </svg>
  );
}
