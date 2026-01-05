import { type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/auth'
import { isAxiosError } from 'axios'
import type { AuthErrorResponse } from '../types/auth'
import './Login.css'

function Login() {
  const { login, isMutating, error } = useAuth()
  const navigate = useNavigate()

  const errorMessage = error
    ? (isAxiosError<AuthErrorResponse>(error) && error.response?.data?.message) || 'Login failed. Please check your credentials.'
    : null

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const result = await login({
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    })
    if (result) {
      navigate('/')
    }
  }

  return (
    <>
      <title>Log in - Flaskr</title>
      <header>
        <h1>Log In</h1>
      </header>
      {isMutating && <div className="flash">ログイン中...</div>}
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
        <input type="submit" value="Log In" disabled={isMutating} />
      </form>
    </>
  )
}

export default Login
