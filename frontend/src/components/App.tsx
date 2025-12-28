import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../contexts/auth'
import Layout from './Layout'
import Home from './Home'
import Login from './Login'
import Register from './Register'
import Create from './Create'
import Update from './Update'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {/*
            認証チェック実装メモ:
            現在: <Navigate>コンポーネントで各ページ内でチェック (Create.tsx, Update.tsx)

            将来的な改善案 (セキュリティ・UX向上のため):
            1. createBrowserRouter + loader による事前チェックを追加
            2. コンポーネントレンダリング前にリダイレクト (フラッシュ防止)
            3. React Query キャッシュとの統合

            実装例:
            const protectedLoader = async () => {
              const user = await queryClient.fetchQuery({
                queryKey: ['currentUser'],
                queryFn: authQueryFn,
                staleTime: 5 * 60 * 1000,
              })
              if (!user) throw redirect('/')
              return null
            }

            参考: https://reactrouter.com/en/main/route/loader
          */}
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="create" element={<Create />} />
              <Route path="posts/:id/update" element={<Update />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
