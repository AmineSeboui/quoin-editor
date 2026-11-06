import { LANGUAGES } from './playground-languages';
import type { Settings } from './playground-source';

type Props = { settings: Settings; onChange: (next: Settings) => void; loading: boolean };

type ToggleProps = { id: string; label: string; note: string; checked: boolean; onChange: (next: boolean) => void };

function Toggle({ id, label, note, checked, onChange }: ToggleProps) {
  return (
    <div className="play-toggle">
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <label htmlFor={id}>{label}</label>
      <p>{note}</p>
    </div>
  );
}

export function PlaygroundSettings({ settings, onChange, loading }: Props) {
  const set = <Key extends keyof Settings>(key: Key, value: Settings[Key]) => onChange({ ...settings, [key]: value });
  return (
    <section className="play-pane play-settings" aria-labelledby="play-settings-heading">
      <div className="pane-bar">
        <h2 id="play-settings-heading">What the editor is passed</h2>
      </div>
      <div className="play-fields">
        <div className="play-field">
          <label htmlFor="play-language">Language</label>
          <select
            id="play-language"
            value={settings.language}
            onChange={(event) => set('language', event.target.value)}
          >
            {LANGUAGES.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <p aria-live="polite">
            {loading
              ? 'Downloading the pack.'
              : 'One entry per language, about 5.5 KB gzip, fetched only when you pick it. Nothing is detected.'}
          </p>
        </div>
        <Toggle
          id="play-highlighting"
          label="Syntax highlighting"
          note="quoin-editor/highlight colours code blocks. The grammars are a chunk fetched the first time it mounts."
          checked={settings.highlighting}
          onChange={(next) => set('highlighting', next)}
        />
        <Toggle
          id="play-source"
          label="Markdown source"
          note="quoin-editor/source shows the document as the markdown it is stored as, with the caret's block marked."
          checked={settings.source}
          onChange={(next) => set('source', next)}
        />
        <Toggle
          id="play-read-only"
          label="Read only"
          note="The same canvas, drawn without editing: no caret, no slash menu, no drag handles."
          checked={settings.readOnly}
          onChange={(next) => set('readOnly', next)}
        />
      </div>
    </section>
  );
}
