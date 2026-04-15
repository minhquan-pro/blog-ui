import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PostCard } from "@/components/post/post-card";
import { useBookmarkedPostIds } from "@/hooks/use-bookmarked-post-ids";
import {
  getPostsByTagSlug,
  getProfileByUserId,
  getTagBySlug,
  getTags,
} from "@/lib/api";
import { tagsForPost } from "@/lib/post-helpers";
import type { Post, Tag, UserProfile } from "@/types/domain";
import { Skeleton } from "@/components/ui/skeleton";

export function TagPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tag, setTag] = useState<Tag | undefined>(undefined);
  const [authorById, setAuthorById] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const { bookmarkedIds, toggleBookmarkForPost } = useBookmarkedPostIds();

  const bootstrap = useCallback(async () => {
    if (!slug) return;
    const [p, t, tagRow] = await Promise.all([
      getPostsByTagSlug(slug),
      getTags(),
      getTagBySlug(slug),
    ]);
    setPosts(p);
    setAllTags(t);
    setTag(tagRow);
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
  }, [slug]);

  useEffect(() => {
    let c = false;
    void (async () => {
      if (!slug) return;
      setLoading(true);
      await bootstrap();
      if (c) return;
    })();
    return () => {
      c = true;
    };
  }, [bootstrap, slug]);

  const onBookmark = async (postId: string) => {
    const on = await toggleBookmarkForPost(postId);
    toast.message(on ? t("post.savedToast") : t("post.removedToast"));
  };

  if (!loading && !tag) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">{t("tag.notFound")}</h1>
        <Link to="/" className="mt-4 inline-block text-accent-foreground underline">
          {t("tag.backHome")}
        </Link>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-12 w-1/2" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold">#{tag.name}</h1>
      <p className="mt-2 text-muted-foreground">{t("tag.subtitle")}</p>
      <div className="mt-10 space-y-8">
        {loading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">{t("tag.empty")}</p>
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
