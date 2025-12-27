export type AuthRequest = {
  username: string
  password: string
}

export type AuthResponse = {
  success: boolean
  message: string
  userId: number
  username: string
}

export type User = {
  userId: number
  username: string
}
