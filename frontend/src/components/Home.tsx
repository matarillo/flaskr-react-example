import { Link, useLoaderData, useRouteLoaderData } from 'react-router'
import type { User } from '../types/auth'
import type { ListPostsResponse } from '../types/post'
import PostList from './PostList'

function Home() {
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

export default Home
