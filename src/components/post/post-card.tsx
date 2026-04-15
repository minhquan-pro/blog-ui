import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Archive,
  Bookmark,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { Post, Tag, UserProfile } from "@/types/domain";
import { useAuth } from "@/contexts/auth-context";
import { deletePost, patchPostStatus } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface PostCardProps {
  post: Post;
  author: UserProfile;
  tags: Tag[];
  style?: React.CSSProperties;
  /** Hiển thị bookmark khi có callback */
  bookmarked?: boolean;
  onBookmarkToggle?: () => void;
  /** Owner: refetch list sau archive/delete */
  onPostMutated?: () => void;
}

function PostCardComponent({
  post,
  author,
  tags,
  style,
  bookmarked = false,
  onBookmarkToggle,
  onPostMutated,
}: PostCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const dateLocale = i18n.language.startsWith("en") ? "en-US" : "vi-VN";

  const href = `/p/${author.username}/${post.slug}`;
  const isOwner = Boolean(user?.id && user.id === post.authorId);
  const showBookmark = Boolean(onBookmarkToggle && user);
  const showOwnerMenu = Boolean(isOwner && onPostMutated && post.status !== "draft");
  const showToolbar = showBookmark || showOwnerMenu;

  const date =
    post.publishedAt &&
    new Date(post.publishedAt).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const onArchive = async () => {
    if (!onPostMutated) return;
    setBusy(true);
    try {
      if (post.status === "archived") {
        await patchPostStatus(post.id, "published");
        toast.success(t("postCard.restoreSuccess"));
      } else {
        await patchPostStatus(post.id, "archived");
        toast.success(t("postCard.archiveSuccess"));
      }
      onPostMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("postCard.updateError"));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    setBusy(true);
    try {
      await deletePost(post.id);
      toast.success(t("postCard.deleteSuccess"));
      setDeleteOpen(false);
      onPostMutated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("postCard.deleteError"));
    } finally {
      setBusy(false);
    }
  };

  const toolbar = (
    <div className="flex gap-1">
      {showBookmark ? (
        <Button
          type="button"
          size="icon"
          variant={bookmarked ? "secondary" : "outline"}
          className="size-6 border-border/80 bg-background/90 shadow-sm backdrop-blur-sm"
          aria-pressed={bookmarked}
          aria-label={
            bookmarked ? t("postCard.bookmarkRemove") : t("postCard.bookmarkSave")
          }
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBookmarkToggle?.();
          }}
        >
          <Bookmark
            className={`size-3.5 ${bookmarked ? "fill-current" : ""}`}
            aria-hidden
          />
        </Button>
      ) : null}
      {showOwnerMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-6 border-border/80 bg-background/90 shadow-sm backdrop-blur-sm"
                aria-label={t("postCard.postOptions")}
              disabled={busy}
              onClick={(e) => e.stopPropagation()}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MoreHorizontal className="size-3.5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                void onArchive();
              }}
            >
              <Archive className="size-4" />
              {post.status === "archived"
                ? t("postCard.unarchive")
                : t("postCard.archive")}
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
              {t("postCard.deletePost")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );

  return (
    <article style={style}>
      <Card className="relative overflow-hidden border-border/80 transition hover:border-accent-foreground/20 hover:shadow-md">
        {post.coverImageUrl ? (
          <div className="relative">
            <Link to={href} className="block">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={post.coverImageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover object-center transition duration-500 hover:scale-[1.02]"
                />
              </div>
            </Link>
            {showToolbar ? (
              <div
                className="absolute right-2 top-2 z-10 flex gap-1"
                onClick={(e) => e.preventDefault()}
              >
                {toolbar}
              </div>
            ) : null}
          </div>
        ) : showToolbar ? (
          <div className="flex justify-end gap-1 border-b border-border/60 bg-muted/20 px-4 py-2">
            {toolbar}
          </div>
        ) : null}
        <Link to={href} className="block">
          <CardHeader className="space-y-2 pb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="size-6">
                <AvatarImage src={author.avatarUrl} alt="" loading="lazy" />
                <AvatarFallback>{author.displayName.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span>{author.displayName}</span>
              {date ? <span aria-hidden>·</span> : null}
              {date ? <time dateTime={post.publishedAt!}>{date}</time> : null}
            </div>
            <h2 className="font-display text-xl font-semibold leading-snug tracking-tight text-foreground md:text-2xl">
              {post.title}
            </h2>
            {post.subtitle ? (
              <p className="text-sm text-muted-foreground">{post.subtitle}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {post.excerpt ? (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Link
                  key={t.id}
                  to={`/tag/${t.slug}`}
                  className={cn(badgeVariants({ variant: "secondary" }))}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.name}
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("postCard.readMinutes", { min: post.readingTimeMinutes })}
            </p>
          </CardContent>
        </Link>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>{t("postCard.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("postCard.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={busy}
            >
              {t("postCard.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void onConfirmDelete()}
              disabled={busy}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("postCard.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export const PostCard = memo(PostCardComponent);
