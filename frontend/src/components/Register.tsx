import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/auth'
import type { AuthErrorResponse } from '../types/auth'

function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('') // loginに渡すため、FormDataを使わない
  const [password, setPassword] = useState('') // loginに渡すため、FormDataを使わない

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async () => {
      // 登録成功後に自動ログイン
      await login({ username, password })
      navigate('/')
    },
  })

  const errorMessage = registerMutation.error
    ? (isAxiosError<AuthErrorResponse>(registerMutation.error) && registerMutation.error.response?.data?.message) || 'Registration failed. Please try again.'
    : null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    registerMutation.mutate({ username, password })
  }

  return (
    <>
      <title>Register - Flaskr</title>
      <header>
        <h1>Register</h1>
      </header>
      {registerMutation.isPending && <div className="flash">登録中...</div>}
      {errorMessage && <div className="flash">{errorMessage}</div>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          name="username"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          type="password"
          name="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input type="submit" value="Register" disabled={registerMutation.isPending} />
      </form>
    </>
  );
}

export default Register;
