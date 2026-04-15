import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const result = await register(email, password, displayName, username);
      if (result.ok) {
        toast.success(t("register.successToast"));
        navigate("/");
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-display text-3xl font-semibold">{t("register.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("register.subtitle")}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reg-email">{t("register.email")}</Label>
          <Input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-pass">{t("register.password")}</Label>
          <Input
            id="reg-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">{t("register.displayName")}</Label>
          <Input
            id="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user">{t("register.username")}</Label>
          <Input
            id="user"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            pattern="[a-z0-9_]+"
            title={t("register.usernameHint")}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("register.submitting") : t("register.submit")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("register.hasAccount")}{" "}
        <Link to="/login" className="text-accent-foreground underline">
          {t("register.login")}
        </Link>
      </p>
    </div>
  );
}
