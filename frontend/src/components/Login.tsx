import { Form, useActionData, useNavigation, redirect } from 'react-router'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import type { AuthErrorResponse } from '../types/auth'
import './Login.css'

type LoginActionData = { error: string }

export async function loginAction({ request }: { request: Request }) {
  const formData = await request.formData()
  try {
    await authApi.login({
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    })
    return redirect('/')
  } catch (error) {
    if (isAxiosError<AuthErrorResponse>(error) && error.response?.data?.message) {
      return { error: error.response.data.message }
    }
    return { error: 'Login failed. Please check your credentials.' }
  }
}

export function Login() {
  const actionData = useActionData<LoginActionData>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <>
      <title>Log in - Flaskr</title>
      <header>
        <h1>Log In</h1>
      </header>
      {isSubmitting && <div className="flash">ログイン中...</div>}
      {actionData?.error && <div className="flash">{actionData.error}</div>}
      <Form method="post">
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
        <input type="submit" value="Log In" disabled={isSubmitting} />
      </Form>
    </>
  )
}
