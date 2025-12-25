import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import PostList from './PostList.tsx'
import type { Post, PostResponse } from '../data/post.ts'

// 1. MSWのサーバー設定: APIのモック
const posts: Post[] = [
  { id: 1, title: 'Vitestの基本', body: '', created: '2025-01-01', author: { id: 1, username: 'foo' } },
  { id: 2, title: 'TanStack Queryのテスト', body: '', created: '2025-01-01', author: { id: 2, username: 'bar' } },
];
const postResponse: PostResponse = {
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
    return HttpResponse.json(postResponse);
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

describe('PostList Component', () => {
  it('APIから取得した記事一覧が表示されること', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <PostList />
      </QueryClientProvider>
    );

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

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <PostList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error fetching posts/i)).toBeInTheDocument();
    });
  });
});