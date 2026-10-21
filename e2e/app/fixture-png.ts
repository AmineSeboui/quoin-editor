/** A 40 by 30 red PNG, small enough to inline, that every browser decodes to its natural size. */
export const FIXTURE_PNG = {
  width: 40,
  height: 30,
  base64:
    'iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAK0lEQVR4nO3NMQ0AAAgDsMmZfxXIQgYcTfo3056IWCwWi8VisVgsFov/xguJMCDM2TzTeAAAAABJRU5ErkJggg==',
};

export const fixtureDataUrl = `data:image/png;base64,${FIXTURE_PNG.base64}`;
