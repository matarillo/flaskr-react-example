import axios from 'axios'
import type { AuthResponse, LoginRequest } from '../types/auth'

const api = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
})

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
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
