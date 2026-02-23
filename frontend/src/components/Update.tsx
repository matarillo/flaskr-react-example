import { type ReactNode } from 'react'
import { Form, useActionData, useNavigation, useLoaderData, redirect } from 'react-router'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import { postApi } from '../api/post'
import type { PostErrorResponse, FindPostResponse } from '../types/post'

type UpdateLoaderData = { post: FindPostResponse | null }
type UpdateActionData = { error: string }

// 認証失敗 → リダイレクト、404 → { post: null }、その他エラー → errorElement へ伝播
export async function updateLoader(
  { params }: { params: { id?: string } }
): Promise<Response | UpdateLoaderData> {
  const { id } = params
  if (!id) return redirect('/')

  // 認証チェック
  try {
    const authResponse = await authApi.getCurrentUser()
    if (!authResponse.success) return redirect('/')
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return redirect('/')
    throw error
  }

  // 投稿取得: 404 はアプリの正常系なので null を返してコンポーネントへ委譲
  try {
    const post = await postApi.find({ id: Number(id) })
    return { post }
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return { post: null }
    throw error
  }
}

export async function updateAction(
  { request, params }: { request: Request; params: { id?: string } }
) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  const id = Number(params.id)

  if (intent === 'delete') {
    try {
      await postApi.delete({ id })
      return redirect('/')
    } catch (error) {
      if (isAxiosError<PostErrorResponse>(error) && error.response?.data?.message) {
        return { error: error.response.data.message }
      }
      return { error: '投稿の削除に失敗しました' }
    }
  }

  // intent === 'update'
  try {
    await postApi.update({
      id,
      title: formData.get('title') as string,
      body: formData.get('body') as string,
    })
    return redirect('/')
  } catch (error) {
    if (isAxiosError<PostErrorResponse>(error) && error.response?.data?.message) {
      return { error: error.response.data.message }
    }
    return { error: '投稿の更新に失敗しました' }
  }
}

type UpdateFormProps = {
  post: FindPostResponse
}

function UpdateForm({ post }: UpdateFormProps) {
  const actionData = useActionData<UpdateActionData>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <>
      {isSubmitting && <div className="flash">送信中...</div>}
      {actionData?.error && <div className="flash">{actionData.error}</div>}
      <Form method="post">
        <input type="hidden" name="intent" value="update" />
        <label htmlFor="title">Title</label>
        <input
          name="title"
          id="title"
          defaultValue={post.title}
          required
        />
        <label htmlFor="body">Body</label>
        <textarea
          name="body"
          id="body"
          defaultValue={post.body}
        ></textarea>
        <input type="submit" value="Save" disabled={isSubmitting} />
      </Form>
      <hr />
      <Form
        method="post"
        onSubmit={(e) => {
          if (!window.confirm('本当に削除しますか？')) e.preventDefault()
        }}
      >
        <input type="hidden" name="intent" value="delete" />
        <input className="danger" type="submit" value="Delete" disabled={isSubmitting} />
      </Form>
    </>
  )
}

function UpdateLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <title>Edit - Flaskr</title>
      <header>
        <h1>Edit Post</h1>
      </header>
      {children}
    </>
  )
}

export function Update() {
  const { post } = useLoaderData() as UpdateLoaderData

  return (
    <UpdateLayout>
      {post
        ? <UpdateForm post={post} />
        : <div className="flash">投稿が見つかりません</div>
      }
    </UpdateLayout>
  )
}

export function UpdateError() {
  return (
    <UpdateLayout>
      <div className="flash">エラーが発生しました</div>
    </UpdateLayout>
  )
}
