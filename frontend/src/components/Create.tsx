import { type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { postApi } from '../api/post'
import type { PostErrorResponse } from '../types/post'
import { useAuth } from '../contexts/auth'

function Create() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: postApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      navigate('/')
    },
  })

  const errorMessage = createMutation.error
    ? (isAxiosError<PostErrorResponse>(createMutation.error) && createMutation.error.response?.data?.message) || '投稿の作成に失敗しました'
    : null

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      title: formData.get('title') as string,
      body: formData.get('body') as string,
    })
  }

  if (!user) return <Navigate to="/" replace />

  return (
    <>
      <title>New Post - Flaskr</title>
      <header>
        <h1>New Post</h1>
      </header>
      {createMutation.isPending && <div className="flash">送信中...</div>}
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
        <input type="submit" value="Save" disabled={createMutation.isPending} />
      </form>
    </>
  )
}

export default Create;
