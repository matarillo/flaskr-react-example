export type Post = {
  id: number;
  title: string;
  body: string;
  created: string;
  author: {
    id: number;
    username: string;
  };
}

export type PostResponse = Post & {
  success: boolean;
  message: string;
}

export type PostsResponse = {
  success: boolean;
  posts: (Post & { updateUrl?: string; deleteUrl?: string; })[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}
