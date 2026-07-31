import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { clearSession } from "@/auth/session";
import { isAuthenticated as hasStoredToken } from "@/auth/tokens";
import { safeReturnTo } from "@/features/auth/redirect";
import LoginForm from "@/features/auth/LoginForm";
import RegisterForm from "@/features/auth/RegisterForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PageShell from "@/components/layout/PageShell";

type AuthMode = "login" | "register";

/**
 * Login Page — Auth APIs
 * POST /auth/v1/public/auth/login
 * POST /auth/v1/public/auth/register
 *
 * Supports query params:
 * - returnTo: URL to redirect after successful auth (e.g. /products/1#reviews)
 * - mode: initial mode (login or register)
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const initialMode = searchParams.get("mode") || "login";

  const [mode, setMode] = useState<AuthMode>(
    initialMode === "register" ? "register" : "login",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Track auth state live (not mount-once): a logout that lands here must
  // never show a stale "Already Logged In" card.
  useEffect(() => {
    const sync = () => setIsAuthenticated(hasStoredToken());
    sync();
    window.addEventListener("auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Update mode when query param changes
  useEffect(() => {
    if (initialMode === "login" || initialMode === "register") {
      setMode(initialMode);
    }
  }, [initialMode]);

  const handleLogout = async () => {
    await clearSession();
    setIsAuthenticated(false);
  };

  const handleSuccess = () => {
    void navigate(returnTo);
  };

  // Already authenticated — show message + CTA
  if (isAuthenticated) {
    return (
      <PageShell width="narrow" pad="roomy">
        <Card>
          <CardHeader>
            <CardTitle>Already Logged In</CardTitle>
            <CardDescription>You are already logged in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => void navigate("/products")}>
              Go to Products
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void handleLogout()}
            >
              Logout
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow" pad="roomy">
      <Card size="sm">
        <CardHeader>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Link>
          <h2
            data-slot="card-title"
            className="font-heading text-base font-medium"
          >
            {mode === "login" ? "Login" : "Register"}
          </h2>
          <CardDescription className="font-mono text-xs">
            API: POST /auth/v1/public/auth/{mode === "login" ? "login" : "register"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <RegisterForm onSuccess={handleSuccess} />
          )}

          <p className="mt-3 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                No account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => setMode("register")}
                >
                  Register
                </Button>
              </>
            ) : (
              <>
                Have account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => setMode("login")}
                >
                  Login
                </Button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
