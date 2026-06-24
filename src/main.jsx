import ReactDOM from 'react-dom/client'
import { AppProvider } from './AppContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import SmartClassroomApp from './SmartClassroomApp.jsx'
import './styles/global.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <AppProvider>
      <SmartClassroomApp />
    </AppProvider>
  </ToastProvider>
)
