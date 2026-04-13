import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import {
  getEditablePost,
  getTags,
  listPublications,
  savePost,
  type EditorPostPayload,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleBody } from "@/components/post/article-body";
import type { PostStatus, Publication } from "@/types/domain";

export function WritePage() {
  const { postId } = useParams<{ postId?: string }>();
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [cover, setCover] = useState("");
  const [tagInput, setTagInput] = useState("typescript, react");
  const [publicationId, setPublicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [pubs, setPubs] = useState<Publication[]>([]);

  useEffect(() => {
    void listPublications().then(setPubs);
  }, []);

  useEffect(() => {
    if (!postId || !user) {
      setLoading(false);
      return;
    }
    let c = false;
    void Promise.all([getEditablePost(postId), getTags()]).then(([p, allTags]) => {
      if (c || !p) {
        if (!c && !p) toast.error("Không mở được bài này");
        setLoading(false);
        return;
      }
      setTitle(p.title);
      setSubtitle(p.subtitle);
      setBody(p.body);
      setExcerpt(p.excerpt);
      setCover(p.coverImageUrl);
      const tags = allTags
        .filter((t) => p.tagIds.includes(t.id))
        .map((t) => t.slug)
        .join(", ");
      setTagInput(tags || "typescript");
      setPublicationId(p.publicationId);
      setLoading(false);
    });
    return () => {
      c = true;
    };
  }, [postId, user]);

  if (!isAuthenticated || !user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const onSave = async (nextStatus: PostStatus) => {
    setSaving(true);
    try {
      const tagSlugs = tagInput
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const payload: EditorPostPayload = {
        title: title.trim() || "Không tiêu đề",
        subtitle: subtitle.trim(),
        body,
        excerpt: excerpt.trim(),
        coverImageUrl: cover.trim(),
        tagSlugs,
        status: nextStatus,
        publicationId,
      };
      const saved = await savePost(postId, user.id, payload);
      toast.success(nextStatus === "published" ? "Đã xuất bản" : "Đã lưu");
      if (nextStatus === "published") {
        navigate(`/p/${profile.username}/${saved.slug}`);
      } else {
        navigate("/me");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Đang tải bài…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">
          {postId ? "Sửa bài" : "Viết bài mới"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void onSave("draft")}
          >
            Lưu nháp
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void onSave("published")}
          >
            Xuất bản
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Tiêu đề</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề bài viết"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sub">Phụ đề</Label>
          <Input
            id="sub"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Tùy chọn"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Publication (tuỳ chọn)</Label>
            <Select
              value={publicationId ?? "none"}
              onValueChange={(v) => setPublicationId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cá nhân" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chỉ tài khoản cá nhân</SelectItem>
                {pubs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tag (slug, phân cách bởi dấu phẩy)</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover">URL ảnh bìa</Label>
          <Input
            id="cover"
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ex">Tóm tắt (excerpt)</Label>
          <Textarea
            id="ex"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <Tabs defaultValue="edit" className="mt-10">
        <TabsList>
          <TabsTrigger value="edit">Markdown</TabsTrigger>
          <TabsTrigger value="preview">Xem trước</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="mt-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[360px] font-mono text-sm"
            placeholder="Viết bằng Markdown…"
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-4 rounded-xl border border-border p-6">
          <ArticleBody markdown={body || "*Chưa có nội dung*"} />
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link to="/me" className="underline">
          Về thư viện
        </Link>
      </p>
    </div>
  );
}
