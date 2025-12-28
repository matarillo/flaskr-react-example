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
export type ListPostsRequest = {
  page: number
  size: number
}

export type CreatePostRequest = {
  title: string
  body: string
}

export type FindPostRequest = {
  id: number
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
export type ListPostsResponse = {
  success: boolean
  posts: PostWithActions[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  isFirst: boolean
  isLast: boolean
}

export type CreatePostResponse = Post & {
  success: boolean
  message: string
}

export type FindPostResponse = PostWithActions & {
  success: boolean
  message: string
}

export type UpdatePostResponse = CreatePostResponse

export type DeletePostResponse = {
  success: boolean
  message: string
  postId: number
}

export type PostErrorResponse = {
  success: boolean
  message: string
}
