import { createBrowserRouter, RouterProvider, redirect } from 'react-router'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import { postApi } from '../api/post'
import Layout from './Layout'
import Home from './Home'
import Login, { loginAction } from './Login'
import Register, { registerAction } from './Register'
import Create, { createAction } from './Create'
import { Update, UpdateError, updateLoader, updateAction } from './Update'
import type { User } from '../types/auth'
import './App.css'

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

// 投稿一覧ローダー: searchParams から page/size を取得して API を呼ぶ
export async function postsLoader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '0', 10)
  const size = parseInt(url.searchParams.get('size') || '10', 10)
  return postApi.list({ page, size })
}

// 認証が必要なルート用ローダー: レンダリング前に認証チェックし、未認証はリダイレクト
const protectedLoader = async () => {
  try {
    const response = await authApi.getCurrentUser()
    if (!response.success) return redirect('/')
    return null
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return redirect('/')
    throw error
  }
}

// ログアウトアクション: セッションを破棄してホームへリダイレクト
async function logoutAction() {
  await authApi.logout()
  return redirect('/')
}

const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    element: <Layout />,
    loader: rootLoader,
    children: [
      { index: true, element: <Home />, loader: postsLoader },
      { path: 'login', element: <Login />, action: loginAction },
      { path: 'register', element: <Register />, action: registerAction },
      { path: 'create', element: <Create />, loader: protectedLoader, action: createAction },
      { path: 'logout', action: logoutAction },
      {
        path: 'posts/:id/update',
        element: <Update />,
        loader: updateLoader,
        action: updateAction,
        errorElement: <UpdateError />,
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
