import { Link, Outlet, useLoaderData, useFetcher } from 'react-router'
import type { User } from '../types/auth'

function Layout() {
  const { user } = useLoaderData() as { user: User | null }
  const fetcher = useFetcher()
  const isLoggingOut = fetcher.state !== 'idle'

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
                  onClick={() => fetcher.submit(null, { method: 'post', action: '/logout' })}
                  disabled={isLoggingOut}
                  className="anchor"
                  style={{ cursor: isLoggingOut ? 'not-allowed' : 'pointer' }}
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
