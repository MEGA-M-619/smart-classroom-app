import ReactDOM from 'react-dom/client'
import { AppProvider } from './AppContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { ToastProvider } from './components/Toast.jsx'
import SmartClassroomApp from './SmartClassroomApp.jsx'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ToastProvider>
      <AppProvider>
        <SmartClassroomApp />
      </AppProvider>
    </ToastProvider>
  </ErrorBoundary>
)
