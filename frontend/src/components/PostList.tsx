import React from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { PostResponse } from '../data/post'

const fetchPosts = async (): Promise<PostResponse> => {
  const { data } = await axios.get('/api/posts');
  return data;
}

function PostList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
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
    </>
  );
}

export default PostList
