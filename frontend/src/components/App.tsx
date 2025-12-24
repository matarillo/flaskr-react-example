import { useState } from 'react'
import { Link, Outlet } from "react-router";
import './App.css'

function App() {
  const [auth, setAuth] = useState({isAuthenticated: false})

  return (
    <>
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
    </>
  )
}

export default App
