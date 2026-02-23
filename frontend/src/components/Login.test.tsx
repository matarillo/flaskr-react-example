import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { loginAction } from './Login'
import Login from './Login'
import Layout from './Layout'
import type { LoginResponse, AuthErrorResponse } from '../types/auth'

// MSWサーバー: action 内の API 呼び出しをインターセプト
const server = setupServer()

// ルートローダーはモック（API呼び出し不要）、action は実際のものを使用
const renderLogin = () => {
  const router = createMemoryRouter([
    {
      id: 'root',
      path: '/',
      element: <Layout />,
      loader: () => ({ user: null }),
      children: [
        { index: true, element: <div>Home</div> },
        { path: 'login', element: <Login />, action: loginAction },
      ],
    },
  ], { initialEntries: ['/login'] })

  return render(<RouterProvider router={router} />)
}

describe('Login Component', () => {
  beforeAll(() => server.listen())
  afterEach(() => {
    cleanup()
    server.resetHandlers()
  })
  afterAll(() => server.close())

  it('ログインフォームが表示されること', async () => {
    renderLogin()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('ログインが成功したらホーム画面に遷移すること', async () => {
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

    renderLogin()

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    })

    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    // action が redirect('/') を返し、ホーム画面に遷移する
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
    })
  })

  it('ログインが失敗したらエラーメッセージが表示されること', async () => {
    server.use(
      http.post('/api/auth/login', async () => {
        const response: AuthErrorResponse = {
          success: false,
          message: 'Invalid username or password'
        }
        return HttpResponse.json(response, { status: 401 })
      })
    )

    renderLogin()

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    })

    const usernameInput = screen.getByLabelText(/username/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /log in/i })

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument()
    })
  })
})
