import { LANGUAGES } from './playground-languages';
import type { Settings } from './playground-source';

type Props = { settings: Settings; onChange: (next: Settings) => void; loading: boolean };

type Switch = { key: SwitchKey; label: string; note: string };

type SwitchKey = { [Key in keyof Settings]: Settings[Key] extends boolean ? Key : never }[keyof Settings];

const WHEN_MOUNTED: Switch[] = [
  {
    key: 'comments',
    label: 'Comments',
    note: 'Select some text and use the comment button to start a thread. quoin-editor/comments anchors it to that range and leaves the storing to you, as this page does in a store of its own.',
  },
  {
    key: 'ai',
    label: 'AI actions',
    note: "quoin-editor/ai streams a model's answer into the document. This page answers from canned text: Quoin calls no model itself.",
  },
  {
    key: 'collaboration',
    label: 'Collaboration',
    note: 'quoin-editor/yjs and /presence add a second editor with a Yjs document of its own, reconciling over a BroadcastChannel. The document is shared, the comment threads are not.',
  },
];

const WHILE_RUNNING: Switch[] = [
  {
    key: 'highlighting',
    label: 'Syntax highlighting',
    note: 'quoin-editor/highlight colours code blocks. The grammars are a chunk fetched the first time it mounts.',
  },
  {
    key: 'source',
    label: 'Markdown source',
    note: "quoin-editor/source shows the document as the markdown it is stored as, with the caret's block marked.",
  },
  {
    key: 'readOnly',
    label: 'Read only',
    note: 'The same canvas, drawn without editing: no caret, no slash menu, no drag handles.',
  },
];

export function PlaygroundSettings({ settings, onChange, loading }: Props) {
  const set = <Key extends keyof Settings>(key: Key, value: Settings[Key]) => onChange({ ...settings, [key]: value });

  const group = (legend: string, switches: Switch[], first?: boolean) => (
    <fieldset className="play-group">
      <legend>{legend}</legend>
      {first && (
        <div className="play-field">
          <label htmlFor="play-language">Language</label>
          <select id="play-language" value={settings.language} onChange={(event) => set('language', event.target.value)}>
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
      )}
      {switches.map(({ key, label, note }) => (
        <div className="play-toggle" key={key}>
          <input
            id={`play-${key}`}
            type="checkbox"
            checked={settings[key]}
            onChange={(event) => set(key, event.target.checked)}
          />
          <label htmlFor={`play-${key}`}>{label}</label>
          <p>{note}</p>
        </div>
      ))}
    </fieldset>
  );

  return (
    <section className="play-pane play-settings" aria-labelledby="play-settings-heading">
      <div className="pane-bar">
        <h2 id="play-settings-heading">What the editor is passed</h2>
      </div>
      <div className="play-fields">
        {group('Read when the canvas mounts', WHEN_MOUNTED, true)}
        {group('Changed while it runs', WHILE_RUNNING)}
      </div>
    </section>
  );
}
