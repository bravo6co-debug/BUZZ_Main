import { supabase } from '../lib/supabase';

export interface CommunityPost {
  id: string;
  user_id: string;
  category: '자유' | '팁' | '후기' | 'Q&A';
  title: string;
  content: string;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
}

export interface CreatePostData {
  category: '자유' | '팁' | '후기' | 'Q&A';
  title: string;
  content: string;
}

class CommunityService {
  // 게시글 목록 조회
  async getPosts(category?: string, page = 1, limit = 10) {
    try {
      let query = supabase
        .from('community_posts')
        .select(`
          *,
          profiles:user_id (
            name,
            avatar_url
          )
        `, { count: 'exact' })
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (category && category !== '전체') {
        query = query.eq('category', category);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        posts: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error fetching posts:', error);
      return {
        posts: [],
        totalCount: 0,
        totalPages: 0
      };
    }
  }

  // 게시글 작성
  async createPost(postData: CreatePostData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          category: postData.category,
          title: postData.title,
          content: postData.content,
          view_count: 0,
          is_pinned: false
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating post:', error);
      return { 
        success: false, 
        error: error.message || '게시글 작성에 실패했습니다' 
      };
    }
  }

  // 게시글 상세 조회
  async getPost(postId: string) {
    try {
      // 조회수 증가
      await supabase
        .from('community_posts')
        .update({ view_count: supabase.sql`view_count + 1` })
        .eq('id', postId);

      // 게시글 조회
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles:user_id (
            name,
            avatar_url
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching post:', error);
      return null;
    }
  }

  // 내 게시글 조회
  async getMyPosts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching my posts:', error);
      return [];
    }
  }

  // 게시글 수정
  async updatePost(postId: string, updates: Partial<CreatePostData>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('community_posts')
        .update(updates)
        .eq('id', postId)
        .eq('user_id', user.id) // 본인 게시글만 수정 가능
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating post:', error);
      return { 
        success: false, 
        error: error.message || '게시글 수정에 실패했습니다' 
      };
    }
  }

  // 게시글 삭제
  async deletePost(postId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // 본인 게시글만 삭제 가능

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting post:', error);
      return { 
        success: false, 
        error: error.message || '게시글 삭제에 실패했습니다' 
      };
    }
  }

  // 인기 게시글 조회
  async getPopularPosts(limit = 5) {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          id,
          title,
          category,
          view_count,
          created_at
        `)
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular posts:', error);
      return [];
    }
  }

  // 최근 게시글 조회
  async getRecentPosts(limit = 5) {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          id,
          title,
          category,
          created_at,
          profiles:user_id (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent posts:', error);
      return [];
    }
  }

  // 시간 포맷 함수
  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString();
  }
}

export const communityService = new CommunityService();