export type AuthResponse = {
  success: boolean
  userId: number
  username: string
}

export type LoginRequest = {
  username: string
  password: string
}
