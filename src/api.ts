const BASE_URL = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : ''
const API = `${BASE_URL}/api`

let token = localStorage.getItem('dsa-vault-token') || ''

export const setToken = (value: string) => {
  token = value
  if (value) {
    localStorage.setItem('dsa-vault-token', value)
  } else {
    localStorage.removeItem('dsa-vault-token')
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/signup')) {
      setToken('')
    }
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Something went wrong.')
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

export type User = { id: string; name: string; email: string }
export type Problem = { _id: string; title: string; topic: string; difficulty: 'Easy' | 'Medium' | 'Hard'; platform: string; notes: string; solvedAt: string; nextReviewAt: string; intervalDays: number }
export type Dashboard = { total: number; due: number; streak: number; mastery: number; recent: Problem[]; topics: { _id: string; solved: number }[]; activity: { _id: string; count: number }[] }

