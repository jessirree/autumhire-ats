import { createRoot } from 'react-dom/client';
import App from './App';
import { installBuildMarker } from './lib/build';
import './index.css';

installBuildMarker();

createRoot(document.getElementById('root')!).render(<App />);
