import ReactDOM from 'react-dom/client'
import { AppProvider } from './AppContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import SmartClassroomApp from './SmartClassroomApp.jsx'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <AppProvider>
      <SmartClassroomApp />
    </AppProvider>
  </ToastProvider>
)
