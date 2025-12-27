import React from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '../api/posts'

function PostList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '0', 10);
  const size = parseInt(searchParams.get('size') || '10', 10);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['posts', page, size],
    queryFn: () => postsApi.fetchPosts({ page, size }),
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching posts</div>;

  return (
    <>
      {data?.posts.map((post, index) => (
        <React.Fragment key={post.id}>
          <article className="post">
            <header>
              <div>
                <h1>{ post.title }</h1>
                <div className="about">by { post.author.username } on { post.created }</div>
              </div>
              { post.updateUrl != null && <a href="#">Edit</a> }
            </header>
            <p className="body">{ post.body }</p>
          </article>
          {index < data.posts.length - 1 && <hr />}
        </React.Fragment>
      ))}

      {data && (
        <div className="pagination" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
          <button
            onClick={() => setSearchParams({ page: String(page - 1), size: String(size) })}
            disabled={data.isFirst}
            style={{ padding: '0.5rem 1rem', cursor: data.isFirst ? 'not-allowed' : 'pointer' }}
          >
            前へ
          </button>
          <span>
            ページ {data.page + 1} / {data.totalPages} (全 {data.totalElements} 件)
          </span>
          <button
            onClick={() => setSearchParams({ page: String(page + 1), size: String(size) })}
            disabled={data.isLast}
            style={{ padding: '0.5rem 1rem', cursor: data.isLast ? 'not-allowed' : 'pointer' }}
          >
            次へ
          </button>
        </div>
      )}
    </>
  );
}

export default PostList
