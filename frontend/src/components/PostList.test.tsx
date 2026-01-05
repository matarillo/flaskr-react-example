import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { BrowserRouter } from 'react-router'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '../contexts/auth'
import PostList from './PostList.tsx'
import type { Post, ListPostsResponse } from '../types/post.ts'

// 1. MSWのサーバー設定: APIのモック
const posts: Post[] = [
  { id: 1, title: 'Vitestの基本', body: '', created: '2025-01-01', author: { id: 1, username: 'foo' } },
  { id: 2, title: 'SWRのテスト', body: '', created: '2025-01-01', author: { id: 2, username: 'bar' } },
];
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

const server = setupServer(
  http.get('/api/posts', () => {
    return HttpResponse.json(mockListPostsResponse);
  }),
  http.get('/api/auth/current', () => {
    return HttpResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  })
);

// 2. テスト用のラッパー作成
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      <AuthProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthProvider>
    </SWRConfig>
  )
}

describe('PostList Component', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    cleanup()
    server.resetHandlers()
  });
  afterAll(() => server.close());

  it('APIから取得した記事一覧が表示されること', async () => {
    renderWithProviders(<PostList />);

    // 最初はローディングが表示される
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

    // データの取得が完了し、レンダリングされるのを待つ
    await waitFor(() => {
      expect(screen.getByText('Vitestの基本')).toBeInTheDocument();
      expect(screen.getByText('SWRのテスト')).toBeInTheDocument();
    });
  });

  it('APIエラー時にエラーメッセージが表示されること', async () => {
    // このテストケースだけレスポンスをエラーに上書き
    server.use(
      http.get('/api/posts', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderWithProviders(<PostList />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching posts/i)).toBeInTheDocument();
    });
  });
});