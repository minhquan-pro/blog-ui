import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { bookmarkToggle, getBookmarksList } from "@/lib/api";

/**
 * Danh sách id bài đã bookmark (đồng bộ khi đăng nhập) + toggle cho thẻ bài.
 */
export function useBookmarkedPostIds() {
  const { isAuthenticated } = useAuth();
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setIds(new Set());
      return;
    }
    const posts = await getBookmarksList();
    setIds(new Set(posts.map((p) => p.id)));
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleForPost = useCallback(
    async (postId: string): Promise<boolean> => {
      const on = await bookmarkToggle(postId);
      setIds((prev) => {
        const next = new Set(prev);
        if (on) next.add(postId);
        else next.delete(postId);
        return next;
      });
      return on;
    },
    [],
  );

  return {
    bookmarkedIds: ids,
    refreshBookmarks: refresh,
    toggleBookmarkForPost: toggleForPost,
  };
}
