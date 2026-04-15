import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-muted/30 py-6 text-center text-xs text-muted-foreground">
      <p>
        {t("footer.line")}{" "}
        <Link to="/pub/stack-journal" className="underline underline-offset-2">
          {t("footer.stackJournal")}
        </Link>
      </p>
    </footer>
  );
}
