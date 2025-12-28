import axios from 'axios'
import type {
  ListPostsRequest,
  ListPostsResponse,
  CreatePostRequest,
  CreatePostResponse,
  FindPostRequest,
  FindPostResponse,
  UpdatePostRequest,
  UpdatePostResponse,
  DeletePostRequest,
  DeletePostResponse
} from '../types/post'

const api = axios.create({
  baseURL: '/api/posts',
  withCredentials: true,
})

export const postApi = {
  list: async ({ page, size }: ListPostsRequest): Promise<ListPostsResponse> => {
    const { data } = await api.get<ListPostsResponse>('', {
      params: { page, size }
    })
    return data
  },

  create: async ({ title, body }: CreatePostRequest): Promise<CreatePostResponse> => {
    const { data } = await api.post<CreatePostResponse>('', { title, body })
    return data
  },

  find: async( { id }: FindPostRequest): Promise<FindPostResponse> => {
    const { data } = await api.get<FindPostResponse>(`/${id}`)
    return data
  },

  update: async ({ id, title, body }: UpdatePostRequest): Promise<UpdatePostResponse> => {
    const { data } = await api.post<UpdatePostResponse>(`/${id}/update`, { title, body })
    return data
  },

  delete: async ({ id }: DeletePostRequest): Promise<DeletePostResponse> => {
    const { data } = await api.post<DeletePostResponse>(`/${id}/delete`)
    return data
  },
}
