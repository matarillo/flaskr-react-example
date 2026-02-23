import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, it, expect, afterEach } from 'vitest'
import Home from './Home'
import Layout from './Layout'
import type { Post, ListPostsResponse } from '../types/post'

// テストデータ
const posts: Post[] = [
  { id: 1, title: 'Vitestの基本', body: '', created: '2025-01-01', author: { id: 1, username: 'foo' } },
  { id: 2, title: 'データモードのテスト', body: '', created: '2025-01-01', author: { id: 2, username: 'bar' } },
]
const mockListPostsResponse: ListPostsResponse = {
  success: true,
  posts: posts,
  page: 0,
  totalPages: 1,
  totalElements: 2,
  size: 10,
  isFirst: true,
  isLast: true
}

// createMemoryRouter + モックローダーでレンダリング（API呼び出し不要）
const renderHome = (postsData: ListPostsResponse = mockListPostsResponse) => {
  const router = createMemoryRouter([
    {
      id: 'root',
      path: '/',
      element: <Layout />,
      loader: () => ({ user: null }),
      children: [
        { index: true, element: <Home />, loader: () => postsData },
      ],
    },
  ], { initialEntries: ['/'] })

  return render(<RouterProvider router={router} />)
}

describe('PostList Component', () => {
  afterEach(() => {
    cleanup()
  })

  it('ローダーから取得した記事一覧が表示されること', async () => {
    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Vitestの基本')).toBeInTheDocument()
      expect(screen.getByText('データモードのテスト')).toBeInTheDocument()
    })
  })

  it('ページネーション情報が表示されること', async () => {
    renderHome()

    await waitFor(() => {
      expect(screen.getByText('ページ 1 / 1 (全 2 件)')).toBeInTheDocument()
    })
  })

  it('投稿が空の場合にページネーションのみ表示されること', async () => {
    const emptyResponse: ListPostsResponse = {
      success: true,
      posts: [],
      page: 0,
      totalPages: 0,
      totalElements: 0,
      size: 10,
      isFirst: true,
      isLast: true
    }

    renderHome(emptyResponse)

    await waitFor(() => {
      expect(screen.getByText('ページ 1 / 0 (全 0 件)')).toBeInTheDocument()
    })
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
