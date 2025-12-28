import axios from 'axios'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  GetCurrentUserResponse
} from '../types/auth'

const api = axios.create({
  baseURL: '/api/auth',
  withCredentials: true,
})

export const authApi = {
  register: async (credentials: RegisterRequest): Promise<RegisterResponse> => {
    const { data } = await api.post<RegisterResponse>('/register', credentials)
    return data
  },

  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/login', credentials)
    return data
  },

  getCurrentUser: async (): Promise<GetCurrentUserResponse> => {
    const { data } = await api.get<GetCurrentUserResponse>('/current')
    return data
  },

  logout: async (): Promise<void> => {
    await api.post('/logout')
  },
}
