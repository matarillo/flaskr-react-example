import { useState } from 'react'
import { Link, Outlet } from "react-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'

function App() {
  const [auth, setAuth] = useState({ isAuthenticated: false })
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <nav>
        <h1>Flaskr</h1>
        <ul>
          <li><a href="#">Register</a></li>
          <li><Link to="/login">Log In</Link></li>
        </ul>
      </nav>
      <section className="content">
        <Outlet />
      </section>
    </QueryClientProvider>
  )
}

export default App
