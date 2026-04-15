import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language).split("-")[0] ?? "vi";

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-border/80 bg-background/80 p-0.5"
      role="group"
      aria-label="Language"
    >
      <Button
        type="button"
        variant={lang === "en" ? "secondary" : "ghost"}
        size="sm"
        className={cn("h-7 px-2 text-xs", lang === "en" && "font-medium")}
        onClick={() => void i18n.changeLanguage("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant={lang === "vi" ? "secondary" : "ghost"}
        size="sm"
        className={cn("h-7 px-2 text-xs", lang === "vi" && "font-medium")}
        onClick={() => void i18n.changeLanguage("vi")}
      >
        VI
      </Button>
    </div>
  );
}
