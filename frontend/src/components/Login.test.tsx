import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '../contexts/auth'
import type { LoginResponse, AuthErrorResponse } from '../types/auth'
import Login from './Login'

// MSWサーバーのセットアップ
const server = setupServer(
  http.get('/api/auth/current', () => {
    return HttpResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('Login Component', () => {
  it('ログインフォームが表示されること', () => {
    renderWithProviders(<Login />)
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('ログインが成功したらホーム画面に遷移すること', async () => {
    // ログインAPIのモック
    server.use(
      http.post('/api/auth/login', async () => {
        const response: LoginResponse = {
          success: true,
          message: 'Login successful',
          userId: 1,
          username: 'testuser'
        }
        return HttpResponse.json(response)
      })
    )

    renderWithProviders(<Login />)

    // フォームに入力
    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    // fireEvent.change()で値を直接変更
    // Note: userEvent.type()を使用すると、1文字ずつ入力をシミュレートすることで、
    // より実際のユーザー操作に近い形でテストすることも可能
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    // ナビゲーションが発生したことを確認（URLが変わる）
    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
    })
  })

  it('ログインが失敗したらエラーメッセージが表示されること', async () => {
    // ログインAPIのエラーモック
    server.use(
      http.post('/api/auth/login', async () => {
        const response: AuthErrorResponse = {
          success: false,
          message: 'Invalid username or password'
        }
        return HttpResponse.json(response, { status: 401 })
      })
    )

    renderWithProviders(<Login />)

    // フォームに入力
    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    // fireEvent.change()で値を直接変更
    // Note: userEvent.type()を使用すると、1文字ずつ入力をシミュレートすることで、
    // より実際のユーザー操作に近い形でテストすることも可能
    fireEvent.change(usernameInput, { target: { value: 'wronguser' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })
    fireEvent.click(submitButton)

    // エラーメッセージが表示される
    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument()
    })
  })
})