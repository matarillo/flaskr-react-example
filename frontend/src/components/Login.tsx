import { type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../contexts/auth'
import { isAxiosError } from 'axios'
import type { AuthErrorResponse } from '../types/auth'
import './Login.css'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate('/')
    },
  })

  const errorMessage = loginMutation.error
    ? (isAxiosError<AuthErrorResponse>(loginMutation.error) && loginMutation.error.response?.data?.message) || 'Login failed. Please check your credentials.'
    : null

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    loginMutation.mutate({
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    })
  }

  return (
    <>
      <title>Log in - Flaskr</title>
      <header>
        <h1>Log In</h1>
      </header>
      {loginMutation.isPending && <div className="flash">ログイン中...</div>}
      {errorMessage && <div className="flash">{errorMessage}</div>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          name="username"
          id="username"
          required
        />
        <label htmlFor="password">Password</label>
        <input
          type="password"
          name="password"
          id="password"
          required
        />
        <input type="submit" value="Log In" disabled={loginMutation.isPending} />
      </form>
    </>
  )
}

export default Login
