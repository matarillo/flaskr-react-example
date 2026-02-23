import { Link, useLoaderData, useRouteLoaderData } from 'react-router'
import { postApi } from '../api/post'
import type { User } from '../types/auth'
import type { ListPostsResponse } from '../types/post'
import { PostList } from './PostList'

// 投稿一覧ローダー: searchParams から page/size を取得して API を呼ぶ
export async function postsLoader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '0', 10)
  const size = parseInt(url.searchParams.get('size') || '10', 10)
  return postApi.list({ page, size })
}

export function Home() {
  const { user } = useRouteLoaderData('root') as { user: User | null }
  const data = useLoaderData() as ListPostsResponse

  return (
    <>
      <title>Posts - Flaskr</title>
      <header>
        <h1>Posts</h1>
        {user && <Link className="action" to="/create">New</Link>}
      </header>
      <PostList data={data} />
    </>
  )
}
