import { Link, Outlet } from "react-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../contexts/auth'
import './App.css'

const queryClient = new QueryClient()

function AppContent() {
  const { user, logout } = useAuth()

  return (
    <>
      <nav>
        <h1>Flaskr</h1>
        <ul>
          {user ? (
            <>
              <li><span>{user.username}</span></li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
                  Log Out
                </a>
              </li>
            </>
          ) : (
            <>
              <li><a href="#">Register</a></li>
              <li><Link to="/login">Log In</Link></li>
            </>
          )}
        </ul>
      </nav>
      <section className="content">
        <Outlet />
      </section>
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
