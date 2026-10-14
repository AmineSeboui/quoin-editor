import { createRoot } from 'react-dom/client';
import 'quoin-editor/styles.css';
import { Harness } from './harness';
import { HeadlessHarness } from './headless-harness';

const params = new URLSearchParams(location.search);
const doc = params.get('doc') ?? 'empty';
const App = params.get('view') === 'headless' ? HeadlessHarness : Harness;
createRoot(document.getElementById('root')!).render(<App doc={doc} />);
