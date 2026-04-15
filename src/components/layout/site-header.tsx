import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BookMarked,
  Bell,
  Menu,
  Moon,
  PenLine,
  Search,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/contexts/auth-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { t } = useTranslation();
  const { profile, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const qv = q.trim();
    navigate(qv ? `/search?q=${encodeURIComponent(qv)}` : "/search");
    setMobileOpen(false);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-sm font-medium transition",
      isActive
        ? "text-foreground font-semibold"
        : "text-muted-foreground hover:text-foreground",
    );

  const navLinks = (
    <>
      <NavLink
        to="/"
        end
        className={navLinkClass}
        onClick={() => setMobileOpen(false)}
      >
        {t("nav.home")}
      </NavLink>
      <NavLink
        to="/tag/typescript"
        className={navLinkClass}
        onClick={() => setMobileOpen(false)}
      >
        {t("nav.typescript")}
      </NavLink>
      <NavLink
        to="/pub/stack-journal"
        className={navLinkClass}
        onClick={() => setMobileOpen(false)}
      >
        {t("nav.publication")}
      </NavLink>
    </>
  );

  const iconNavLink = (to: string, label: string, icon: ReactNode) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          isActive && "bg-muted text-foreground",
        )
      }
      aria-label={label}
    >
      {icon}
    </NavLink>
  );

  const themeToggleButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="relative shrink-0"
      aria-label={t("nav.themeToggle")}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 rotate-0 scale-100 transition dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition dark:rotate-0 dark:scale-100" />
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto grid h-14 w-full max-w-6xl grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
        {/* Trái: logo + nav (chỉ từ lg — tránh chật tablet) */}
        <div className="flex min-w-0 items-center gap-3 lg:gap-6">
          <Link
            to="/"
            className="shrink-0 font-display text-lg font-semibold tracking-tight text-foreground"
          >
            Editorial
          </Link>
          <nav className="hidden min-w-0 items-center gap-4 lg:flex xl:gap-6">
            {navLinks}
          </nav>
        </div>

        {/* Giữa: ô tìm kiếm — co giãn, không đẩy tràn */}
        <form
          onSubmit={onSearch}
          className="mx-auto hidden min-w-0 max-w-xl flex-1 md:flex"
        >
          <div className="relative w-full min-w-0">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder={t("nav.searchPlaceholder")}
              className="h-9 w-full min-w-0 pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t("nav.searchAria")}
            />
          </div>
        </form>

        {/* Phải: hành động — không co, xếp gọn */}
        <div className="flex min-w-0 flex-shrink-0 flex-nowrap items-center justify-end gap-0.5 sm:gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label={t("nav.mobileSearch")}
            onClick={() => navigate("/search")}
          >
            <Search className="size-4" />
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                aria-label={t("nav.openMenu")}
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,18rem)] sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>{t("nav.menu")}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 text-[15px]">{navLinks}</div>
              <form onSubmit={onSearch} className="px-4">
                <Input
                  placeholder={t("nav.searchField")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label={t("nav.searchAria")}
                />
              </form>
              <SheetFooter className="lg:hidden">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("nav.language")}
                </p>
                <LanguageSwitcher />
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          {themeToggleButton}

          {isAuthenticated ? (
            <>
              {iconNavLink(
                "/notifications",
                t("nav.notifications"),
                <Bell className="size-4" />,
              )}
              {iconNavLink("/me", t("nav.library"), <BookMarked className="size-4" />)}
              <Link
                to="/write"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "hidden shrink-0 sm:inline-flex",
                )}
              >
                <PenLine className="size-4" />
                {t("nav.write")}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    className="relative size-8 shrink-0 rounded-full p-0"
                    aria-label={t("nav.account")}
                  >
                    <Avatar className="size-8">
                      <AvatarImage
                        src={profile?.avatarUrl ? resolveMediaUrl(profile.avatarUrl) : undefined}
                        alt=""
                        loading="lazy"
                      />
                      <AvatarFallback>
                        {(profile?.displayName ?? "?").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() =>
                      navigate(profile ? `/u/${profile.username}` : "/")
                    }
                  >
                    <User className="size-4" />
                    {t("nav.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/write")}>
                    <PenLine className="size-4" />
                    {t("nav.writeArticle")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "shrink-0 px-2 sm:px-2.5",
                )}
              >
                {t("nav.login")}
              </Link>
              <Link
                to="/register"
                className={cn(buttonVariants({ size: "sm" }), "shrink-0 px-2 sm:px-2.5")}
              >
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
