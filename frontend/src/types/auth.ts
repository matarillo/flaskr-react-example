// API request types
export type LoginRequest = {
  username: string
  password: string
}

export type RegisterRequest = {
  username: string
  password: string
}

// API response types
export type LoginResponse = {
  success: boolean
  message: string
  userId: number
  username: string
}

export type RegisterResponse = LoginResponse

export type GetCurrentUserResponse = LoginResponse

// Domain types
export type User = {
  userId: number
  username: string
}
