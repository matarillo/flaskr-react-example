import { type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { isAxiosError } from 'axios'
import { postApi } from '../api/post'
import type { PostErrorResponse } from '../types/post'
import { useAuth } from '../contexts/auth'

function Update() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const renderLayout = (content: ReactNode) => (
    <>
      <title>Edit - Flaskr</title>
      <header>
        <h1>Edit Post</h1>
      </header>
      {content}
    </>
  )

  // Hooks must be called before any conditional returns
  // 個別の投稿を取得
  const { data: post, isLoading } = useSWR(
    id ? `posts/${id}` : null,
    id ? () => postApi.find({ id: Number(id) }) : null
  )

  const { trigger: updateTrigger, isMutating: isUpdating, error: updateError } = useSWRMutation(
    id ? `posts/${id}` : null,
    async (_, { arg }: { arg: { title: string; body: string } }) => {
      if (!id) return
      await postApi.update({ id: Number(id), ...arg })
    },
    {
      onSuccess: () => {
        navigate('/')
      },
    }
  )

  const { trigger: deleteTrigger, isMutating: isDeleting, error: deleteError } = useSWRMutation(
    id ? `posts/${id}` : null,
    async () => {
      if (!id) return
      await postApi.delete({ id: Number(id) })
    },
    {
      onSuccess: () => {
        // 削除成功時は画面遷移のみ行い、リフェッチはHomeコンポーネントで行われる
        navigate('/')
      },
      // 削除成功時は自動リフェッチを無効化（リソースが存在しないため）
      revalidate: false,
    }
  )

  // IDが存在しない場合は早期リターン（全てのHooksの後）
  if (!id) {
    return renderLayout(<div className="flash">無効なURLです</div>)
  }

  const error = updateError || deleteError
  const errorMessage = error
    ? (isAxiosError<PostErrorResponse>(error) && error.response?.data?.message) || '投稿の更新に失敗しました'
    : null

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)
    await updateTrigger({
      title: formData.get('title') as string,
      body: formData.get('body') as string,
    })
  }

  const handleDelete = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!id) return
    if (window.confirm('本当に削除しますか？')) {
      await deleteTrigger()
    }
  }

  // 認証状態の読み込み中は待機
  if (isAuthLoading) {
    return renderLayout(<div className="flash">認証確認中...</div>)
  }

  // 認証されていない場合のみリダイレクト
  if (!user) return <Navigate to="/" replace />

  if (isLoading) {
    return renderLayout(<div className="flash">読み込み中...</div>)
  }

  if (!post) {
    return renderLayout(<div className="flash">投稿が見つかりません</div>)
  }

  return renderLayout(
    <>
      {(isUpdating || isDeleting) && <div className="flash">送信中...</div>}
      {errorMessage && <div className="flash">{errorMessage}</div>}
      <form method="post" onSubmit={handleSubmit}>
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
      <form method="post" onSubmit={handleDelete}>
        <input className="danger" type="submit" value="Delete" disabled={isUpdating || isDeleting} />
      </form>
    </>
  )
}

export default Update;
