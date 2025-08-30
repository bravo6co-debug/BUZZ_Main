import { useState, useEffect } from "react";
import { X, MessageSquare, Edit3, Eye, Clock, User } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { communityService, CommunityPost } from "../services/community.service";
import { toast } from "sonner";

interface CommunityModalProps {
  onClose: () => void;
}

export default function CommunityModal({ onClose }: CommunityModalProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 게시글 작성 폼 상태
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "자유" as CommunityPost['category']
  });

  const categories = ["전체", "자유", "팁", "후기", "Q&A"];

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, currentPage]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const result = await communityService.getPosts(
        selectedCategory === "전체" ? undefined : selectedCategory,
        currentPage,
        10
      );
      setPosts(result.posts);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('게시글을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSubmitPost = async () => {
    if (!newPost.title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    if (!newPost.content.trim()) {
      toast.error('내용을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const result = await communityService.createPost({
        title: newPost.title,
        content: newPost.content,
        category: newPost.category
      });

      if (result.success) {
        toast.success('게시글이 작성되었습니다');
        setShowWriteForm(false);
        setNewPost({ title: "", content: "", category: "자유" });
        loadPosts();
      } else {
        toast.error(result.error || '게시글 작성에 실패했습니다');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('게시글 작성 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare size={20} />
              <h3 className="font-semibold">커뮤니티</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>

          {/* Categories */}
          <div className="p-4 border-b">
            <div className="flex gap-2 mb-3 flex-wrap">
              {categories.map((category) => (
                <Badge 
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
            <Button 
              className="w-full" 
              size="sm"
              onClick={() => setShowWriteForm(true)}
            >
              <Edit3 size={16} className="mr-2" />
              새 글 쓰기
            </Button>
          </div>

          {/* Posts */}
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                게시글을 불러오는 중...
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                아직 게시글이 없습니다.
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1 mb-1">
                        {post.is_pinned && <span className="text-red-500">📌 </span>}
                        {post.title}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {post.content}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">
                      {post.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {post.user?.name || '익명'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {post.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {communityService.formatTimeAgo(post.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>
              <span className="flex items-center px-3 text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Write Form Modal */}
      <Dialog open={showWriteForm} onOpenChange={setShowWriteForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>게시글 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">카테고리</label>
              <div className="flex gap-2">
                {["자유", "팁", "후기", "Q&A"].map((cat) => (
                  <Badge
                    key={cat}
                    variant={newPost.category === cat ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setNewPost({ ...newPost, category: cat as CommunityPost['category'] })}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">제목</label>
              <Input
                placeholder="제목을 입력하세요"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">내용</label>
              <Textarea
                placeholder="내용을 입력하세요"
                rows={6}
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowWriteForm(false)}
                disabled={loading}
              >
                취소
              </Button>
              <Button
                onClick={handleSubmitPost}
                disabled={loading}
              >
                {loading ? '작성 중...' : '작성하기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}