import { type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { isAxiosError } from 'axios'
import { useAuth } from '../contexts/auth'
import type { AuthErrorResponse } from '../types/auth'

function Register() {
  const navigate = useNavigate()
  const { register, isMutating, error } = useAuth()

  const errorMessage = error
    ? (isAxiosError<AuthErrorResponse>(error) && error.response?.data?.message) || 'Registration failed. Please try again.'
    : null

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const result = await register({ username, password })
    if (result) {
      navigate('/')
    }
  }

  return (
    <>
      <title>Register - Flaskr</title>
      <header>
        <h1>Register</h1>
      </header>
      {isMutating && <div className="flash">登録中...</div>}
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
        <input type="submit" value="Register" disabled={isMutating} />
      </form>
    </>
  );
}

export default Register;
