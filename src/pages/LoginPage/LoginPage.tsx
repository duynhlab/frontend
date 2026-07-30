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

  // Check if user is already authenticated
  useEffect(() => {
    setIsAuthenticated(hasStoredToken());
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
      <div className="container mx-auto flex max-w-sm flex-col px-4 py-10">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto flex max-w-sm flex-col px-4 py-10">
      <Card>
        <CardHeader>
          <Link
            to="/"
            className="mb-1 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Link>
          <CardTitle>
            <h2 className="text-xl font-semibold">
              {mode === "login" ? "Login" : "Register"}
            </h2>
          </CardTitle>
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

          <p className="mt-4 text-center text-sm text-muted-foreground">
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
    </div>
  );
}
