import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '../contexts/auth'
import PostList from './PostList.tsx'
import type { Post, PostsResponse } from '../types/post.ts'

// 1. MSWのサーバー設定: APIのモック
const posts: Post[] = [
  { id: 1, title: 'Vitestの基本', body: '', created: '2025-01-01', author: { id: 1, username: 'foo' } },
  { id: 2, title: 'TanStack Queryのテスト', body: '', created: '2025-01-01', author: { id: 2, username: 'bar' } },
];
const PostsResponse: PostsResponse = {
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
    return HttpResponse.json(PostsResponse);
  }),
  http.get('/api/auth/current', () => {
    return HttpResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// 2. テスト用のラッパー作成
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // テスト失敗時に何度もリトライしないようにする
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('PostList Component', () => {
  it('APIから取得した記事一覧が表示されること', async () => {
    renderWithProviders(<PostList />);

    // 最初はローディングが表示される
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

    // データの取得が完了し、レンダリングされるのを待つ
    await waitFor(() => {
      expect(screen.getByText('Vitestの基本')).toBeInTheDocument();
      expect(screen.getByText('TanStack Queryのテスト')).toBeInTheDocument();
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