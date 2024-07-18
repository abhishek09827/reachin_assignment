
import './App.css'
import MailPage from './components/mail/page'
import { ThemeProvider } from "./components/theme-provider"
function App() {


  return (
    <>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <MailPage />
    </ThemeProvider>
    </>
  )
}

export default App
