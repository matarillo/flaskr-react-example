import axios from 'axios'
import type { AuthResponse, AuthRequest } from '../types/auth'

const api = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
})

export const authApi = {
  register: async (credentials: AuthRequest): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/register', credentials)
    return data
  },

  login: async (credentials: AuthRequest): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/login', credentials)
    return data
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    const { data } = await api.get<AuthResponse>('/current')
    return data
  },

  logout: async (): Promise<void> => {
    await api.post('/logout')
  },
}
