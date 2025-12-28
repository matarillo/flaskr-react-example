import { type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { postApi } from '../api/post'
import type { PostErrorResponse } from '../types/post'
import { useAuth } from '../contexts/auth'

function Update() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  // 個別の投稿を取得
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postApi.find({ id: Number(id!) }),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: postApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      navigate('/')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: postApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      navigate('/')
    },
  })

  const errorMessage = updateMutation.error
    ? (isAxiosError<PostErrorResponse>(updateMutation.error) && updateMutation.error.response?.data?.message) || '投稿の更新に失敗しました'
    : null

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!id) return
    const formData = new FormData(e.currentTarget)
    updateMutation.mutate({
      id: Number(id),
      title: formData.get('title') as string,
      body: formData.get('body') as string,
    })
  }

  const handleDelete = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!id) return
    if (window.confirm('本当に削除しますか？')) {
      deleteMutation.mutate({ id: Number(id) })
    }
  }

  const renderLayout = (content: ReactNode) => (
    <>
      <title>Edit - Flaskr</title>
      <header>
        <h1>Edit Post</h1>
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

  if (isLoading) {
    return renderLayout(<div className="flash">読み込み中...</div>)
  }

  if (!post) {
    return renderLayout(<div className="flash">投稿が見つかりません</div>)
  }

  return renderLayout(
    <>
      {updateMutation.isPending && <div className="flash">送信中...</div>}
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
        <input type="submit" value="Save" disabled={updateMutation.isPending} />
      </form>
      <hr />
      <form method="post" onSubmit={handleDelete}>
        <input className="danger" type="submit" value="Delete" disabled={deleteMutation.isPending} />
      </form>
    </>
  )
}

export default Update;
