import { Form, useActionData, useNavigation, redirect } from 'react-router'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import type { AuthErrorResponse } from '../types/auth'

type RegisterActionData = { error: string }

export async function registerAction({ request }: { request: Request }) {
  const formData = await request.formData()
  const credentials = {
    username: formData.get('username') as string,
    password: formData.get('password') as string,
  }
  try {
    await authApi.register(credentials)
    await authApi.login(credentials)
    return redirect('/')
  } catch (error) {
    if (isAxiosError<AuthErrorResponse>(error) && error.response?.data?.message) {
      return { error: error.response.data.message }
    }
    return { error: 'Registration failed. Please try again.' }
  }
}

export function Register() {
  const actionData = useActionData<RegisterActionData>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <>
      <title>Register - Flaskr</title>
      <header>
        <h1>Register</h1>
      </header>
      {isSubmitting && <div className="flash">登録中...</div>}
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
        <input type="submit" value="Register" disabled={isSubmitting} />
      </Form>
    </>
  )
}
