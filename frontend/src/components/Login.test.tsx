import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../contexts/auth'
import type { AuthResponse, AuthErrorResponse } from '../types/auth'
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
    const user = userEvent.setup()

    // ログインAPIのモック
    server.use(
      http.post('/api/auth/login', async () => {
        const response: AuthResponse = {
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

    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // ナビゲーションが発生したことを確認（URLが変わる）
    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
    })
  })

  it('ログインが失敗したらエラーメッセージが表示されること', async () => {
    const user = userEvent.setup()

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

    await user.type(usernameInput, 'wronguser')
    await user.type(passwordInput, 'wrongpass')
    await user.click(submitButton)

    // エラーメッセージが表示される
    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument()
    })
  })
})