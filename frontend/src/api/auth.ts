import axios from 'axios'

export type AuthResponse = {
  success: boolean
  userId: number
  username: string
}

export type LoginRequest = {
  username: string
  password: string
}

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
