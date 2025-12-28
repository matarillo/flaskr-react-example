import axios from 'axios'
import type { PostResponse, PostsResponse } from '../types/post'

export interface FetchPostsParams {
  page: number
  size: number
}

export interface CreateParams {
  title: string;
  body: string;
}

export interface UpdateParams {
  id: number;
  title: string;
  body: string;
}

const api = axios.create({
  baseURL: '/api/posts',
  withCredentials: true,
})

export const postsApi = {
  fetchPosts: async ({ page, size }: FetchPostsParams): Promise<PostsResponse> => {
    const { data } = await api.get<PostsResponse>('', {
      params: { page, size }
    })
    return data
  },

  create: async ({ title, body }: CreateParams): Promise<PostResponse> => {
    const { data } = await api.post<PostResponse>('', {
      params: { title, body }
    })
    return data
  },

  update: async ({ id, title, body }: UpdateParams): Promise<PostResponse> => {
    const { data } = await api.post<PostResponse>(`/${id}/update`, {
      params: { title, body }
    })
    return data
  }
}
