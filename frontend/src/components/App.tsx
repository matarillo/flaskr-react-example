import { createBrowserRouter, RouterProvider, redirect } from 'react-router'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import { Layout, rootLoader, logoutAction } from './Layout'
import { Home, postsLoader } from './Home'
import { Login, loginAction } from './Login'
import { Register, registerAction } from './Register'
import { Create, createAction } from './Create'
import { Update, UpdateError, updateLoader, updateAction } from './Update'
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

export default function App() {
  return <RouterProvider router={router} />
}
