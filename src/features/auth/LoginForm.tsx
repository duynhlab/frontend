import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "@/api/authApi";
import { setTokens } from "@/auth/tokens";
import { toAppError } from "@/lib/errors";
import { applyServerErrors } from "@/lib/forms";
import { notify } from "@/lib/notifications";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginFormValues } from "./schemas";

interface LoginFormProps {
  onSuccess: () => void;
}

const LOGIN_FIELDS = ["username", "password"] as const;

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await login(values.username, values.password);
      if (import.meta.env.DEV) {
        // DEV logs redact the token pair — the refresh token is a durable
        // credential and must not land in console buffers / screenshots.
        console.log("[API] POST /auth/login:", {
          ...result,
          access_token: "[redacted]",
          refresh_token: "[redacted]",
        });
      }
      setTokens(result);
      notify.success("Welcome back");
      onSuccess();
    } catch (err) {
      const appError = toAppError(err, "Invalid username or password");
      applyServerErrors(appError, setError, LOGIN_FIELDS);
      if (import.meta.env.DEV) {
        // Log only diagnostics — the raw axios error carries the request
        // body (err.config.data) which contains the plaintext password.
        console.error("[API ERROR]", appError.status, appError.message);
      }
    }
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
      {errors.root?.server && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{errors.root.server.message}</AlertTitle>
        </Alert>
      )}

      <Field data-invalid={!!errors.username || undefined}>
        <FieldLabel htmlFor="login-username">Username</FieldLabel>
        <Input
          id="login-username"
          type="text"
          placeholder="alice"
          autoComplete="username"
          aria-invalid={!!errors.username}
          {...register("username")}
        />
        <FieldError errors={errors.username ? [errors.username] : undefined} />
      </Field>

      <Field data-invalid={!!errors.password || undefined}>
        <FieldLabel htmlFor="login-password">Password</FieldLabel>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        <FieldError errors={errors.password ? [errors.password] : undefined} />
      </Field>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Please wait..." : "Login"}
      </Button>
    </form>
  );
}
