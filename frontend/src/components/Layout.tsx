import { Link, Outlet, useLoaderData, useFetcher, redirect } from 'react-router'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import type { User } from '../types/auth'

// ルートローダー: 認証状態を取得し全ルートに提供する
export async function rootLoader(): Promise<{ user: User | null }> {
  try {
    const response = await authApi.getCurrentUser()
    if (response.success) {
      return { user: { userId: response.userId, username: response.username } }
    }
    return { user: null }
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return { user: null }
    throw error
  }
}

// ログアウトアクション: セッションを破棄してホームへリダイレクト
export async function logoutAction() {
  await authApi.logout()
  return redirect('/')
}

export function Layout() {
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
