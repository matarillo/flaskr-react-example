import { Link, Outlet } from "react-router";
import { useAuth } from '../contexts/auth'

function Layout() {
  const { user, logout, isMutating } = useAuth()

  return (
    <>
      <nav>
        <h1>Flaskr</h1>
        <ul>
          {user ? (
            <>
              <li><span>{user.username}</span></li>
              <li>
                <button
                  type="button"
                  onClick={() => logout()}
                  disabled={isMutating}
                  className="anchor"
                  style={{ cursor: isMutating ? 'not-allowed' : 'pointer' }}
                >
                  Log Out
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/register">Register</Link></li>
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

export default Layout
