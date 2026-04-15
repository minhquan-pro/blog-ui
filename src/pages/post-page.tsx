import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  Bookmark,
  Heart,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { ArticleBody } from "@/components/post/article-body";
import { CommentThread } from "@/components/comment/comment-thread";
import { useAuth } from "@/contexts/auth-context";
import {
  bookmarkToggle,
  deletePost,
  followToggle,
  getComments,
  getPostById,
  getPostByPathWithViewer,
  getProfileByUserId,
  getTags,
  patchPostStatus,
  postComment,
  likeSet,
} from "@/lib/api";
import { tagsForPost } from "@/lib/post-helpers";
import type { Comment, Post, Tag, UserProfile } from "@/types/domain";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PostPage() {
  const { t, i18n } = useTranslation();
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const dateLocale = i18n.language.startsWith("en") ? "en-US" : "vi-VN";
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [comments, setComments] = useState<Comment[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [likedLocal, setLikedLocal] = useState(false);
  const [following, setFollowing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);

  const load = useCallback(async () => {
    if (!username || !slug) return;
    const pathData = await getPostByPathWithViewer(username, slug);
    if (!pathData) {
      setPost(null);
      return;
    }
    setPost(pathData.post);
    setLikedLocal(pathData.viewerLiked);
    setBookmarked(pathData.viewerHasBookmarked);
    setFollowing(pathData.viewerIsFollowingAuthor);

    const [c, tags] = await Promise.all([
      getComments(pathData.post.id),
      getTags(),
    ]);
    setComments(c);
    setAllTags(tags);
  }, [username, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const [authorProfile, setAuthorProfile] = useState<UserProfile | undefined>();

  useEffect(() => {
    if (!post) {
      setAuthorProfile(undefined);
      return;
    }
    let c = false;
    void getProfileByUserId(post.authorId).then((p) => {
      if (!c) setAuthorProfile(p);
    });
    return () => {
      c = true;
    };
  }, [post]);

  const [profileMap, setProfileMap] = useState<Map<string, UserProfile>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!post) return;
    const ids = new Set([post.authorId, ...comments.map((x) => x.authorId)]);
    let cancelled = false;
    void Promise.all(
      [...ids].map(async (id) => {
        const pr = await getProfileByUserId(id);
        return [id, pr] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next = new Map<string, UserProfile>();
      for (const [id, pr] of pairs) {
        if (pr) next.set(id, pr);
      }
      setProfileMap(next);
    });
    return () => {
      cancelled = true;
    };
  }, [post, comments]);

  const onFollow = async () => {
    if (!user) {
      toast.info(t("post.loginToFollow"));
      return;
    }
    if (!post) return;
    const now = await followToggle(post.authorId);
    setFollowing(now);
    toast.message(now ? t("post.followedToast") : t("post.unfollowedToast"));
  };

  const onBookmark = async () => {
    if (!user || !post) {
      toast.info(t("post.loginToSave"));
      return;
    }
    const now = await bookmarkToggle(post.id);
    setBookmarked(now);
    toast.message(now ? t("post.savedToast") : t("post.removedToast"));
  };

  const onLikeToggle = async () => {
    if (!user || !post) {
      toast.info(t("post.loginToLike"));
      return;
    }
    const next = !likedLocal;
    setLikedLocal(next);
    const updated = await likeSet(post.id, next);
    if (updated) setPost(updated);
    else setLikedLocal(!next);
  };

  const onOwnerArchive = async () => {
    if (!post || post.status === "draft") return;
    setOwnerBusy(true);
    try {
      if (post.status === "archived") {
        await patchPostStatus(post.id, "published");
        toast.success(t("postCard.restoreSuccess"));
      } else {
        await patchPostStatus(post.id, "archived");
        toast.success(t("postCard.archiveSuccess"));
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("postCard.updateError"));
    } finally {
      setOwnerBusy(false);
    }
  };

  const onComment = async (parentId: string | null, body: string) => {
    if (!post) return;
    const c = await postComment(post.id, parentId, body);
    if (c) {
      setComments((prev) => [...prev, c]);
      const fresh = await getPostById(post.id);
      if (fresh) setPost(fresh);
      toast.success(t("post.commentSent"));
    } else toast.error(t("post.commentFailed"));
  };

  if (post === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  const cardAuthor = post ? authorProfile ?? profileMap.get(post.authorId) : undefined;

  if (post && !cardAuthor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (!post || !cardAuthor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">{t("post.notFound")}</h1>
        <p className="mt-2 text-muted-foreground">{t("post.notFoundHint")}</p>
        <Link to="/" className={cn(buttonVariants(), "mt-6 inline-flex")}>
          {t("post.backHome")}
        </Link>
      </div>
    );
  }

  const onConfirmDelete = async () => {
    if (!post) return;
    setDeleteBusy(true);
    try {
      await deletePost(post.id);
      toast.success(t("postCard.deleteSuccess"));
      setDeleteOpen(false);
      const uname = cardAuthor.username;
      navigate(`/u/${uname}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("postCard.deleteError"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const date =
    post.publishedAt &&
    new Date(post.publishedAt).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const tags = tagsForPost(post, allTags);
  const isOwnPost = Boolean(user?.id && user.id === post.authorId);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      {post.coverImageUrl ? (
        <div className="mb-10 aspect-video max-h-[min(420px,55vh)] w-full overflow-hidden rounded-2xl border border-border/60 bg-muted">
          <img
            src={post.coverImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-center"
          />
        </div>
      ) : null}

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link to={`/u/${cardAuthor.username}`} className="flex items-center gap-2">
            <Avatar className="size-10">
              <AvatarImage src={cardAuthor.avatarUrl} alt="" loading="lazy" />
              <AvatarFallback>{cardAuthor.displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{cardAuthor.displayName}</span>
          </Link>
          {date ? (
            <>
              <span aria-hidden>·</span>
              <time dateTime={post.publishedAt!}>{date}</time>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span>
            {t("post.readMinutes", { min: post.readingTimeMinutes })}
          </span>
          {post.status === "draft" ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
              {t("post.draft")}
            </span>
          ) : null}
        </div>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          {post.title}
        </h1>
        {post.subtitle ? (
          <p className="text-xl text-muted-foreground">{post.subtitle}</p>
        ) : null}
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-y border-border py-4">
        <div className="flex min-w-[200px] flex-1 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={likedLocal ? "secondary" : "outline"}
            size="sm"
            className="gap-2"
            disabled={!user}
            aria-pressed={likedLocal}
            aria-label={likedLocal ? t("post.unlike") : t("post.like")}
            onClick={() => void onLikeToggle()}
          >
            <Heart
              className={`size-4 ${likedLocal ? "fill-current" : ""}`}
              aria-hidden
            />
            {t("post.likes", { count: post.likeCount })}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwnPost ? (
            <>
              <Link
                to={`/write/${post.id}`}
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
              >
                <Pencil className="size-4" aria-hidden />
                {t("post.edit")}
              </Link>
              {post.status !== "draft" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={t("post.postOptions")}
                      disabled={ownerBusy}
                    >
                      {ownerBusy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="size-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        void onOwnerArchive();
                      }}
                    >
                      <Archive className="size-4" />
                      {post.status === "archived"
                        ? t("post.unarchive")
                        : t("post.archive")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="size-4" />
                      {t("post.deletePost")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </>
          ) : (
            <Button
              type="button"
              variant={following ? "secondary" : "outline"}
              onClick={() => void onFollow()}
            >
              {following ? t("post.following") : t("post.follow")}
            </Button>
          )}
          <Button
            type="button"
            variant={bookmarked ? "secondary" : "outline"}
            onClick={() => void onBookmark()}
            aria-pressed={bookmarked}
          >
            <Bookmark className="size-4" />
            {t("post.save")}
          </Button>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              to={`/tag/${tag.slug}`}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      ) : null}

      <Separator className="my-10" />

      <ArticleBody markdown={post.body} />

      <Separator className="my-14" />

      <CommentThread
        comments={comments}
        profiles={profileMap}
        currentUserId={user?.id ?? null}
        onSubmit={onComment}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!deleteBusy}>
          <DialogHeader>
            <DialogTitle>{t("post.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("post.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteBusy}
            >
              {t("post.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void onConfirmDelete()}
              disabled={deleteBusy}
            >
              {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("post.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
