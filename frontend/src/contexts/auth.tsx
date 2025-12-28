// contexts/auth.tsx
import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import type { LoginRequest, RegisterRequest, User } from '../types/auth'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  refetch: () => void
  register: (credentials: RegisterRequest) => Promise<void>
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await authApi.getCurrentUser()
        if (response.success) {
          return {
            userId: response.userId,
            username: response.username,
          }
        }
        return null
      } catch {
        return null
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      if (response.success) {
        queryClient.setQueryData(['currentUser'], {
          userId: response.userId,
          username: response.username,
        })
        // 認証状態に依存するクエリを無効化して再フェッチ
        queryClient.invalidateQueries({ queryKey: ['posts'] })
      }
    },
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(['currentUser'], null)
      // 認証状態に依存するクエリを無効化して再フェッチ
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  const register = async (credentials: RegisterRequest) => {
    // Register API を呼び出す
    await authApi.register(credentials)
    // 成功したら続けて Login API を呼び出す
    await loginMutation.mutateAsync(credentials)
  }

  const login = async (credentials: LoginRequest) => {
    await loginMutation.mutateAsync(credentials)
  }

  const logout = async () => {
    await logoutMutation.mutateAsync()
  }

  return (
    <AuthContext.Provider
      value={{
        user: data ?? null,
        isLoading,
        refetch,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}