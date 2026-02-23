import { createBrowserRouter, RouterProvider, redirect } from "react-router";
import { isAxiosError } from 'axios'
import { AuthProvider } from '../contexts/auth'
import { authApi } from '../api/auth'
import Layout from './Layout'
import Home from './Home'
import Login from './Login'
import Register from './Register'
import Create from './Create'
import { Update, UpdateError, updateLoader } from './Update'
import './App.css'

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

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'create', element: <Create />, loader: protectedLoader },
      {
        path: 'posts/:id/update',
        element: <Update />,
        loader: updateLoader,
        errorElement: <UpdateError />,
      },
    ],
  },
])

function App() {
  return (
    // ログアウト後にローダーを再実行し、認証が必要なページから自動でリダイレクトさせる
    <AuthProvider onLogout={() => router.revalidate()}>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
