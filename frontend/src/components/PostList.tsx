import { Fragment } from 'react'
import { useSearchParams, Link } from 'react-router'
import type { ListPostsResponse } from '../types/post'

type PostListProps = {
  data: ListPostsResponse
}

function PostList({ data }: PostListProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const size = parseInt(searchParams.get('size') || '10', 10);

  return (
    <>
      {data.posts.map((post, index) => (
        <Fragment key={post.id}>
          <article className="post">
            <header>
              <div>
                <h1>{ post.title }</h1>
                <div className="about">by { post.author.username } on { post.created }</div>
              </div>
              { post.updateUrl != null && <Link to={`/posts/${post.id}/update`} className='action'>Edit</Link> }
            </header>
            <p className="body">{ post.body }</p>
          </article>
          {index < data.posts.length - 1 && <hr />}
        </Fragment>
      ))}

      <div className="pagination" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => setSearchParams({ page: String(data.page - 1), size: String(size) })}
          disabled={data.isFirst}
          style={{ padding: '0.5rem 1rem', cursor: data.isFirst ? 'not-allowed' : 'pointer' }}
        >
          前へ
        </button>
        <span>
          ページ {data.page + 1} / {data.totalPages} (全 {data.totalElements} 件)
        </span>
        <button
          onClick={() => setSearchParams({ page: String(data.page + 1), size: String(size) })}
          disabled={data.isLast}
          style={{ padding: '0.5rem 1rem', cursor: data.isLast ? 'not-allowed' : 'pointer' }}
        >
          次へ
        </button>
      </div>
    </>
  );
}

export default PostList
