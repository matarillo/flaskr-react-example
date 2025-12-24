export type Post = {
  id: number;
  title: string;
  body: string;
  created: string;
  author: {
    id: number;
    username: string;
  };
  updateUrl?: string;
  deleteUrl?: string;
}

export type PostResponse = {
  success: boolean;
  posts: Post[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}
