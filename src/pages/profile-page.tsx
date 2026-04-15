import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PostCard } from "@/components/post/post-card";
import { useAuth } from "@/contexts/auth-context";
import { useBookmarkedPostIds } from "@/hooks/use-bookmarked-post-ids";
import {
  followToggle,
  getPostsForProfile,
  getProfileByUsernameWithViewer,
  getTags,
  patchMyProfile,
  type PatchMyProfilePayload,
  uploadAvatarImage,
} from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media-url";
import { tagsForPost } from "@/lib/post-helpers";
import type { Post, Tag, UserProfile } from "@/types/domain";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username: routeUsername } = useParams<{ username: string }>();
  const { user, refreshSession } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [viewerFollowing, setViewerFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { bookmarkedIds, toggleBookmarkForPost } = useBookmarkedPostIds();

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const bootstrap = useCallback(async () => {
    if (!routeUsername) return;
    const [pv, tagList] = await Promise.all([
      getProfileByUsernameWithViewer(routeUsername),
      getTags(),
    ]);
    if (!pv) {
      setProfile(undefined);
      setLoading(false);
      return;
    }
    setProfile(pv.profile);
    setViewerFollowing(pv.viewerIsFollowingAuthor);
    setAllTags(tagList);
    const p = await getPostsForProfile(routeUsername);
    setPosts(p);
    setLoading(false);
  }, [routeUsername]);

  useEffect(() => {
    let c = false;
    void (async () => {
      if (!routeUsername) return;
      setLoading(true);
      await bootstrap();
      if (c) return;
    })();
    return () => {
      c = true;
    };
  }, [bootstrap, routeUsername]);

  useEffect(() => {
    if (editOpen && profile) {
      setEditDisplayName(profile.displayName);
      setEditUsername(profile.username);
      setEditBio(profile.bio);
      setAvatarFile(null);
      setAvatarPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [editOpen, profile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const onBookmark = async (postId: string) => {
    const on = await toggleBookmarkForPost(postId);
    toast.message(on ? t("post.savedToast") : t("post.removedToast"));
  };

  const following =
    user && profile && user.id !== profile.userId ? viewerFollowing : false;

  const onFollow = async () => {
    if (!user) {
      toast.info(t("post.loginToFollow"));
      return;
    }
    if (!profile) return;
    const now = await followToggle(profile.userId);
    setViewerFollowing(now);
    toast.message(now ? t("post.followedToast") : t("post.unfollowedToast"));
  };

  const onPickAvatar = () => {
    avatarInputRef.current?.click();
  };

  const onAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    e.target.value = "";
  };

  const onSaveProfile = async () => {
    if (!profile || !routeUsername) return;
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await uploadAvatarImage(avatarFile);
      }
      const payload: PatchMyProfilePayload = {
        displayName: editDisplayName.trim(),
        username: editUsername.trim(),
        bio: editBio.trim(),
      };
      if (avatarUrl !== undefined) {
        payload.avatarUrl = avatarUrl;
      }
      const updated = await patchMyProfile(payload);
      await refreshSession();
      setEditOpen(false);
      toast.success(t("profile.updateSuccess"));
      if (updated.username !== routeUsername) {
        navigate(`/u/${updated.username}`, { replace: true });
      } else {
        await bootstrap();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("profile.updateError"));
    } finally {
      setSaving(false);
    }
  };

  if (!loading && profile === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">{t("profile.notFound")}</h1>
        <Link to="/" className={cn(buttonVariants(), "mt-6 inline-flex")}>
          {t("post.backHome")}
        </Link>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <div className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-start">
        <div className="relative shrink-0">
          <Avatar className="size-24 border border-border">
            <AvatarImage src={resolveMediaUrl(profile.avatarUrl)} alt="" loading="lazy" />
            <AvatarFallback className="text-2xl">
              {profile.displayName.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 space-y-3">
          <h1 className="font-display text-3xl font-semibold">{profile.displayName}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio ? <p className="max-w-xl text-pretty">{profile.bio}</p> : null}
          {user?.id !== profile.userId ? (
            <Button
              type="button"
              variant={following ? "secondary" : "default"}
              onClick={() => void onFollow()}
            >
              {following ? t("post.following") : t("post.follow")}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                >
                  {t("profile.editProfile")}
                </Button>
                <DialogContent className="sm:max-w-md" showCloseButton={!saving}>
                  <DialogHeader>
                    <DialogTitle>{t("profile.editTitle")}</DialogTitle>
                    <DialogDescription>{t("profile.editDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <Avatar className="size-20 border border-border">
                        <AvatarImage
                          src={avatarPreviewUrl ?? resolveMediaUrl(profile.avatarUrl)}
                          alt=""
                        />
                        <AvatarFallback className="text-xl">
                          {editDisplayName.slice(0, 1) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex w-full flex-col gap-2 sm:flex-1">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={onAvatarFileChange}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={onPickAvatar}
                        >
                          {t("profile.changeAvatar")}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {t("profile.avatarHint")}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="profile-display-name">{t("register.displayName")}</Label>
                      <Input
                        id="profile-display-name"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="profile-username">{t("register.username")}</Label>
                      <Input
                        id="profile-username"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        autoComplete="username"
                        spellCheck={false}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("register.usernameHint")}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="profile-bio">{t("profile.bioLabel")}</Label>
                      <Textarea
                        id="profile-bio"
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        rows={4}
                        className="resize-y min-h-[100px]"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => setEditOpen(false)}
                    >
                      {t("post.cancel")}
                    </Button>
                    <Button
                      type="button"
                      disabled={saving}
                      onClick={() => void onSaveProfile()}
                    >
                      {saving ? t("profile.saving") : t("post.save")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Link to="/me" className={cn(buttonVariants({ variant: "outline" }))}>
                {t("profile.myLibrary")}
              </Link>
            </div>
          )}
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">
        {t("profile.postsTitle")}
      </h2>
      <div className="mt-6 space-y-8">
        {posts.length === 0 ? (
          <p className="text-muted-foreground">{t("profile.empty")}</p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={profile}
              tags={tagsForPost(post, allTags)}
              bookmarked={bookmarkedIds.has(post.id)}
              onBookmarkToggle={() => void onBookmark(post.id)}
              onPostMutated={() => void bootstrap()}
            />
          ))
        )}
      </div>
    </div>
  );
}
