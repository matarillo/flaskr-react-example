// Domain types
export type Post = {
  id: number
  title: string
  body: string
  created: string
  author: {
    id: number
    username: string
  }
}

export type PostWithActions = Post & {
  updateUrl?: string
  deleteUrl?: string
}

// API request types
export type FetchPostsRequest = {
  page: number
  size: number
}

export type CreatePostRequest = {
  title: string
  body: string
}

export type UpdatePostRequest = {
  id: number
  title: string
  body: string
}

export type DeletePostRequest = {
  id: number
}

// API response types
export type CreatePostResponse = {
  success: boolean
  message: string
  post: Post
}

export type UpdatePostResponse = CreatePostResponse

export type FetchPostsResponse = {
  success: boolean
  posts: PostWithActions[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  isFirst: boolean
  isLast: boolean
}

export type DeletePostResponse = {
  success: boolean
  message: string
  postId: number
}

export type PostErrorResponse = {
  success: boolean
  message: string
}
