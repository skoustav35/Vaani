export type PostType = 'image' | 'video' | 'article';

export interface Post {
  id: number;
  type: PostType;
  title: string;
  body: string;
  excerpt: string | null;
  media_url: string | null;
  duration: string | null;
  author_name: string;
  author_avatar: string;
  author_title: string;
  tags: string[];
  code_lang: string | null;
  likes_count: number;
  saves_count: number;
  reading_time: number | null;
  created_at: string;
  liked?: boolean;
  saved?: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  author_name: string;
  author_avatar: string;
  body: string;
  created_at: string;
}

export interface PostsPage {
  data: Post[];
  nextCursor: number | null;
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' formula ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}
