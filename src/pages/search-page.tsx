import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PostCard } from "@/components/post/post-card";
import { useBookmarkedPostIds } from "@/hooks/use-bookmarked-post-ids";
import { getProfileByUserId, getTags, searchPosts } from "@/lib/api";
import { tagsForPost } from "@/lib/post-helpers";
import type { Post, Tag, UserProfile } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(q);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [authorById, setAuthorById] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const { bookmarkedIds, toggleBookmarkForPost } = useBookmarkedPostIds();

  useEffect(() => {
    setQuery(q);
  }, [q]);

  const bootstrap = useCallback(async () => {
    const [p, t] = await Promise.all([searchPosts(q), getTags()]);
    setPosts(p);
    setAllTags(t);
    const ids = [...new Set(p.map((x) => x.authorId))];
    const pairs = await Promise.all(
      ids.map(async (id) => {
        const pr = await getProfileByUserId(id);
        return [id, pr] as const;
      }),
    );
    const map: Record<string, UserProfile> = {};
    for (const [id, pr] of pairs) {
      if (pr) map[id] = pr;
    }
    setAuthorById(map);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    let c = false;
    setLoading(true);
    void (async () => {
      await bootstrap();
      if (c) return;
    })();
    return () => {
      c = true;
    };
  }, [bootstrap]);

  const onBookmark = async (postId: string) => {
    const on = await toggleBookmarkForPost(postId);
    toast.message(on ? t("post.savedToast") : t("post.removedToast"));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(query.trim() ? { q: query.trim() } : {});
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold">{t("search.title")}</h1>
      <form onSubmit={onSubmit} className="mt-6 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="max-w-md"
          aria-label={t("search.placeholder")}
        />
        <Button type="submit">{t("search.submit")}</Button>
      </form>
      <div className="mt-10 space-y-8">
        {loading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">
            {q ? t("search.empty") : t("search.hint")}
          </p>
        ) : (
          posts.map((post) => {
            const author = authorById[post.authorId];
            if (!author) return null;
            return (
              <PostCard
                key={post.id}
                post={post}
                author={author}
                tags={tagsForPost(post, allTags)}
                bookmarked={bookmarkedIds.has(post.id)}
                onBookmarkToggle={() => void onBookmark(post.id)}
                onPostMutated={() => void bootstrap()}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
