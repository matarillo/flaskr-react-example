// contexts/auth.tsx
import { createContext, useContext, type ReactNode } from 'react'
import useSWR, { mutate } from 'swr'
import useSWRMutation from 'swr/mutation'
import { isAxiosError } from 'axios'
import { authApi } from '../api/auth'
import type { LoginRequest, RegisterRequest, User } from '../types/auth'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  isMutating: boolean
  error: Error | null
  refresh: () => void
  register: (credentials: RegisterRequest) => Promise<User | null>
  login: (credentials: LoginRequest) => Promise<User | null>
  logout: () => Promise<null>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

const currentUserFetcher = async () => {
  try {
    const response = await authApi.getCurrentUser()
    if (response.success) {
      return {
        userId: response.userId,
        username: response.username,
      }
    }
    return null
  } catch (error) {
    // 401 (未認証) の場合は null を返す（ログアウト状態として扱う）
    if (isAxiosError(error) && error.response?.status === 401) {
      return null
    }
    // その他のエラー（ネットワークエラーなど）は再スロー
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate: refresh } = useSWR<User | null>(
    'currentUser',
    currentUserFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  )

  const {
    trigger: loginTrigger,
    isMutating: isLoginMutating,
    error: loginError
  } = useSWRMutation(
    'auth/login',
    async (_key, { arg }: { arg: LoginRequest }) => {
      // authApi.login()が401を返した場合、axiosがエラーをスローする
      // throwOnError: false により、エラーはloginErrorに設定される
      const response = await authApi.login(arg)
      const user = {
        userId: response.userId,
        username: response.username,
      }
      // 成功時のみcurrentUserキャッシュを更新
      await refresh(user, { revalidate: false })
      // 認証状態に依存するクエリを再検証
      // 意図的にawaitせず、バックグラウンドで再フェッチ（画面遷移をブロックしない）
      mutate((key) => typeof key === 'string' && key.startsWith('posts'))
      return user
    },
    {
      throwOnError: false,
      populateCache: false,
    }
  )

  const {
    trigger: logoutTrigger,
    isMutating: isLogoutMutating,
    error: logoutError
  } = useSWRMutation(
    'auth/logout',
    async () => {
      await authApi.logout()
      // 成功時のみcurrentUserキャッシュをクリア
      await refresh(null, { revalidate: false })
      // 認証状態に依存するクエリを再検証
      // 意図的にawaitせず、バックグラウンドで再フェッチ（画面遷移をブロックしない）
      mutate((key) => typeof key === 'string' && key.startsWith('posts'))
      return null
    },
    {
      throwOnError: false,
      populateCache: false,
    }
  )

  const register = async (credentials: RegisterRequest) => {
    await authApi.register(credentials)
    return await loginTrigger(credentials)
  }

  const isMutating = isLoginMutating || isLogoutMutating
  const error = loginError || logoutError

  return (
    <AuthContext.Provider
      value={{
        user: data ?? null,
        isLoading,
        isMutating,
        error,
        refresh,
        register,
        login: loginTrigger,
        logout: logoutTrigger,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}