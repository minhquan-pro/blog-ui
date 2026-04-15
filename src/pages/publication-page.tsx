import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PostCard } from "@/components/post/post-card";
import { useBookmarkedPostIds } from "@/hooks/use-bookmarked-post-ids";
import {
  getPostsForPublicationSlug,
  getProfileByUserId,
  getPublicationBySlug,
  getTags,
} from "@/lib/api";
import { tagsForPost } from "@/lib/post-helpers";
import type { Post, Publication, Tag, UserProfile } from "@/types/domain";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function PublicationPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [pub, setPub] = useState<Publication | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [authorById, setAuthorById] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const { bookmarkedIds, toggleBookmarkForPost } = useBookmarkedPostIds();

  const bootstrap = useCallback(async () => {
    if (!slug) return;
    const [publication, p, t] = await Promise.all([
      getPublicationBySlug(slug),
      getPostsForPublicationSlug(slug),
      getTags(),
    ]);
    setPub(publication);
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

  if (!loading && !pub) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">
          {t("publication.notFound")}
        </h1>
        <Link to="/" className="mt-4 inline-block text-accent-foreground underline">
          {t("publication.backHome")}
        </Link>
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-12 md:flex-row md:items-center md:px-6">
          <Avatar className="size-24 border border-border">
            <AvatarImage src={pub.avatarUrl} alt="" loading="lazy" />
            <AvatarFallback>{pub.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <h1 className="font-display text-3xl font-semibold">{pub.name}</h1>
            <p className="text-muted-foreground">{pub.description}</p>
            <Link
              to={`/pub/${pub.slug}/settings`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {t("publication.settings")}
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 md:px-6">
        <h2 className="font-display text-xl font-semibold">
          {t("publication.postsTitle")}
        </h2>
        {loading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">{t("publication.empty")}</p>
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
