import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PostCard } from "@/components/post/post-card";
import { useAuth } from "@/contexts/auth-context";
import { useBookmarkedPostIds } from "@/hooks/use-bookmarked-post-ids";
import {
  getBookmarksList,
  getDraftsForCurrentUser,
  getMyPosts,
  getProfileByUserId,
  getTags,
} from "@/lib/api";
import { listLocalDrafts } from "@/lib/local-drafts";
import { tagsForPost } from "@/lib/post-helpers";
import type { Post, Tag, UserProfile } from "@/types/domain";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export function LibraryPage() {
  const { t, i18n } = useTranslation();
  const { user, profile, isAuthenticated } = useAuth();
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [authorById, setAuthorById] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const { bookmarkedIds, toggleBookmarkForPost, refreshBookmarks } =
    useBookmarkedPostIds();

  const bootstrap = useCallback(async () => {
    if (!isAuthenticated || !user || !profile) return;
    const [bm, mine, dr, t] = await Promise.all([
      getBookmarksList(),
      getMyPosts(),
      getDraftsForCurrentUser(),
      getTags(),
    ]);
    setBookmarks(bm);
    setMyPosts(mine);
    setDrafts(dr);
    setAllTags(t);
    const ids = [...new Set([...bm, ...mine].map((x) => x.authorId))];
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
    if (!map[profile.userId]) {
      map[profile.userId] = profile;
    }
    setAuthorById(map);
    setLoading(false);
  }, [isAuthenticated, user, profile]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let c = false;
    void (async () => {
      setLoading(true);
      await bootstrap();
      if (c) return;
    })();
    return () => {
      c = true;
    };
  }, [bootstrap, isAuthenticated]);

  const onBookmarkFromCard = async (postId: string) => {
    const on = await toggleBookmarkForPost(postId);
    toast.message(on ? t("post.savedToast") : t("post.removedToast"));
    await refreshBookmarks();
    const bm = await getBookmarksList();
    setBookmarks(bm);
  };

  const localDrafts = user ? listLocalDrafts(user.id) : [];

  if (!isAuthenticated || !user || !profile) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold">{t("library.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("library.greeting", { name: profile.displayName })}
      </p>

      <Tabs defaultValue="bookmarks" className="mt-10">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="bookmarks">{t("library.tabSaved")}</TabsTrigger>
          <TabsTrigger value="mine">{t("library.tabMine")}</TabsTrigger>
          <TabsTrigger value="drafts">{t("library.tabDrafts")}</TabsTrigger>
        </TabsList>
        <TabsContent value="bookmarks" className="mt-6 space-y-8">
          {loading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : bookmarks.length === 0 ? (
            <p className="text-muted-foreground">{t("library.emptySaved")}</p>
          ) : (
            bookmarks.map((post) => {
              const author = authorById[post.authorId];
              if (!author) return null;
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  author={author}
                  tags={tagsForPost(post, allTags)}
                  bookmarked={bookmarkedIds.has(post.id)}
                  onBookmarkToggle={() => void onBookmarkFromCard(post.id)}
                  onPostMutated={() => void bootstrap()}
                />
              );
            })
          )}
        </TabsContent>
        <TabsContent value="mine" className="mt-6 space-y-8">
          {loading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : myPosts.length === 0 ? (
            <p className="text-muted-foreground">
              {t("library.emptyMine")}{" "}
              <Link to="/write" className="text-accent-foreground underline">
                {t("library.writeNew")}
              </Link>
            </p>
          ) : (
            myPosts.map((post) => {
              const author = authorById[post.authorId];
              if (!author) return null;
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  author={author}
                  tags={tagsForPost(post, allTags)}
                  bookmarked={bookmarkedIds.has(post.id)}
                  onBookmarkToggle={() => void onBookmarkFromCard(post.id)}
                  onPostMutated={() => void bootstrap()}
                />
              );
            })
          )}
        </TabsContent>
        <TabsContent value="drafts" className="mt-6 space-y-6">
          {loading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : drafts.length === 0 && localDrafts.length === 0 ? (
            <p className="text-muted-foreground">
              {t("library.emptyDrafts")}{" "}
              <Link to="/write" className="text-accent-foreground underline">
                {t("library.writeNew")}
              </Link>
            </p>
          ) : (
            <>
              {localDrafts.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("library.device")}
                  </p>
                  {localDrafts.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <h2 className="font-display text-lg font-semibold">
                          {d.title.trim() || t("library.untitled")}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {t("library.updated")}{" "}
                          {new Date(d.updatedAt).toLocaleString(
                            i18n.language.startsWith("en") ? "en-US" : "vi-VN",
                          )}
                        </p>
                      </div>
                      <Link
                        to={`/write?localDraft=${encodeURIComponent(d.id)}`}
                        className={cn(
                          buttonVariants(),
                          "inline-flex h-9 items-center justify-center",
                        )}
                      >
                        {t("library.continue")}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : null}
              {drafts.length > 0 ? (
                <div className="space-y-3">
                  {localDrafts.length > 0 ? (
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("library.account")}
                    </p>
                  ) : null}
                  {drafts.map((post) => (
                    <div
                      key={post.id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <h2 className="font-display text-lg font-semibold">
                          {post.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {t("library.updated")}{" "}
                          {new Date(post.updatedAt).toLocaleString(
                            i18n.language.startsWith("en") ? "en-US" : "vi-VN",
                          )}
                        </p>
                      </div>
                      <Link
                        to={`/write/${post.id}`}
                        className={cn(
                          buttonVariants(),
                          "inline-flex h-9 items-center justify-center",
                        )}
                      >
                        {t("library.continue")}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
