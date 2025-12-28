import axios from 'axios'
import type {
  FetchPostsRequest,
  FetchPostsResponse,
  CreatePostRequest,
  CreatePostResponse,
  UpdatePostRequest,
  UpdatePostResponse
} from '../types/post'

const api = axios.create({
  baseURL: '/api/posts',
  withCredentials: true,
})

export const postsApi = {
  fetchPosts: async ({ page, size }: FetchPostsRequest): Promise<FetchPostsResponse> => {
    const { data } = await api.get<FetchPostsResponse>('', {
      params: { page, size }
    })
    return data
  },

  create: async ({ title, body }: CreatePostRequest): Promise<CreatePostResponse> => {
    const { data } = await api.post<CreatePostResponse>('', { title, body })
    return data
  },

  update: async ({ id, title, body }: UpdatePostRequest): Promise<UpdatePostResponse> => {
    const { data } = await api.post<UpdatePostResponse>(`/${id}/update`, { title, body })
    return data
  }
}
