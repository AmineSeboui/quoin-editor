import { createRoot } from 'react-dom/client';
import 'quoin-editor/styles.css';
import { Harness } from './harness';

const doc = new URLSearchParams(location.search).get('doc') ?? 'empty';
createRoot(document.getElementById('root')!).render(<Harness doc={doc} />);
