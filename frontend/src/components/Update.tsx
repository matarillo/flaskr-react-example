import { type FormEvent, type ReactNode } from 'react'
import { useNavigate, useLoaderData, useParams, redirect } from 'react-router'
import useSWRMutation from 'swr/mutation'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import { postApi } from '../api/post'
import type { PostErrorResponse, FindPostResponse } from '../types/post'

type UpdateLoaderData = { post: FindPostResponse | null }

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

type UpdateFormProps = {
  post: FindPostResponse
}

function UpdateForm({ post }: UpdateFormProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { trigger: updateTrigger, isMutating: isUpdating, error: updateError } = useSWRMutation(
    `posts/${id}/update`,
    async (_, { arg }: { arg: { title: string; body: string } }) => {
      await postApi.update({ id: Number(id), ...arg })
    },
    {
      onSuccess: () => {
        navigate('/')
      },
    }
  )

  // update と delete でキーを分けることで isMutating 状態が独立する
  const { trigger: deleteTrigger, isMutating: isDeleting, error: deleteError } = useSWRMutation(
    `posts/${id}/delete`,
    async () => {
      await postApi.delete({ id: Number(id) })
    },
    {
      onSuccess: () => {
        navigate('/')
      },
      revalidate: false,
    }
  )

  const error = updateError || deleteError
  const errorMessage = error
    ? (isAxiosError<PostErrorResponse>(error) && error.response?.data?.message) || '投稿の更新に失敗しました'
    : null

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await updateTrigger({
      title: formData.get('title') as string,
      body: formData.get('body') as string,
    })
  }

  const handleDelete = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (window.confirm('本当に削除しますか？')) {
      await deleteTrigger()
    }
  }

  return (
    <>
      {(isUpdating || isDeleting) && <div className="flash">送信中...</div>}
      {errorMessage && <div className="flash">{errorMessage}</div>}
      <form onSubmit={handleSubmit}>
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
        <input type="submit" value="Save" disabled={isUpdating || isDeleting} />
      </form>
      <hr />
      <form onSubmit={handleDelete}>
        <input className="danger" type="submit" value="Delete" disabled={isUpdating || isDeleting} />
      </form>
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
