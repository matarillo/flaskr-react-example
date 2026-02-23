import { Form, useActionData, useNavigation, redirect } from 'react-router'
import { isAxiosError } from 'axios'
import { postApi } from '../api/post'
import type { PostErrorResponse } from '../types/post'

type CreateActionData = { error: string }

export async function createAction({ request }: { request: Request }) {
  const formData = await request.formData()
  try {
    await postApi.create({
      title: formData.get('title') as string,
      body: formData.get('body') as string,
    })
    return redirect('/')
  } catch (error) {
    if (isAxiosError<PostErrorResponse>(error) && error.response?.data?.message) {
      return { error: error.response.data.message }
    }
    return { error: '投稿の作成に失敗しました' }
  }
}

export function Create() {
  const actionData = useActionData<CreateActionData>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <>
      <title>New Post - Flaskr</title>
      <header>
        <h1>New Post</h1>
      </header>
      {isSubmitting && <div className="flash">送信中...</div>}
      {actionData?.error && <div className="flash">{actionData.error}</div>}
      <Form method="post">
        <label htmlFor="title">Title</label>
        <input
          name="title"
          id="title"
          required
        />
        <label htmlFor="body">Body</label>
        <textarea
          name="body"
          id="body"
        ></textarea>
        <input type="submit" value="Save" disabled={isSubmitting} />
      </Form>
    </>
  )
}
