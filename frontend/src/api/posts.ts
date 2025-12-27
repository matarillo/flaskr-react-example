import axios from 'axios'
import type { PostResponse } from '../data/post'

export interface FetchPostsParams {
  page: number
  size: number
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export const postsApi = {
  fetchPosts: async ({ page, size }: FetchPostsParams): Promise<PostResponse> => {
    const { data } = await api.get<PostResponse>('/posts', {
      params: { page, size }
    })
    return data
  },
}
