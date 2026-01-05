import { type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import useSWRMutation from 'swr/mutation'
import { isAxiosError } from 'axios'
import { postApi } from '../api/post'
import type { PostErrorResponse } from '../types/post'
import { useAuth } from '../contexts/auth'

function Create() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()

  const { trigger, isMutating, error } = useSWRMutation(
    'posts',
    async (_, { arg }: { arg: { title: string; body: string } }) => {
      await postApi.create(arg)
    },
    {
      onSuccess: () => {
        navigate('/')
      },
    }
  )

  const errorMessage = error
    ? (isAxiosError<PostErrorResponse>(error) && error.response?.data?.message) || '投稿の作成に失敗しました'
    : null

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await trigger({
      title: formData.get('title') as string,
      body: formData.get('body') as string,
    })
  }

  const renderLayout = (content: ReactNode) => (
    <>
      <title>New Post - Flaskr</title>
      <header>
        <h1>New Post</h1>
      </header>
      {content}
    </>
  )

  // 認証状態の読み込み中は待機
  if (isAuthLoading) {
    return renderLayout(<div className="flash">認証確認中...</div>)
  }

  // 認証されていない場合のみリダイレクト
  if (!user) return <Navigate to="/" replace />

  return renderLayout(
    <>
      {isMutating && <div className="flash">送信中...</div>}
      {errorMessage && <div className="flash">{errorMessage}</div>}
      <form method="post" onSubmit={handleSubmit}>
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
        <input type="submit" value="Save" disabled={isMutating} />
      </form>
    </>
  )
}

export default Create;
