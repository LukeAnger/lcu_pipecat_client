import { createRoot } from 'react-dom/client';
import App from './App.jsx';

import { RtviProvider } from './context/RTVIContext';
import { ActivityProvider } from './context/ActivityContext';

createRoot(document.getElementById('root')).render(
    <ActivityProvider>
            <RtviProvider>
                <App />
            </RtviProvider>
    </ActivityProvider>
);
