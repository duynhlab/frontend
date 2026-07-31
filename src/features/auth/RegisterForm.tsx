import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { register as registerApi } from "@/api/authApi";
import { setTokens } from "@/auth/tokens";
import { toAppError } from "@/lib/errors";
import { applyServerErrors } from "@/lib/forms";
import { notify } from "@/lib/notifications";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterFormValues } from "./schemas";

interface RegisterFormProps {
  onSuccess: () => void;
}

const REGISTER_FIELDS = ["username", "email", "password"] as const;

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await registerApi(values.username, values.email, values.password);
      if (import.meta.env.DEV) {
        console.log("[API] POST /auth/register:", {
          ...result,
          access_token: "[redacted]",
          refresh_token: "[redacted]",
        });
      }
      setTokens(result);
      notify.success("Welcome back");
      onSuccess();
    } catch (err) {
      const appError = toAppError(err, "Registration failed");
      applyServerErrors(appError, setError, REGISTER_FIELDS);
      if (import.meta.env.DEV) {
        console.error("[API ERROR]", appError.status, appError.message);
      }
    }
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-3">
      {errors.root?.server && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{errors.root.server.message}</AlertTitle>
        </Alert>
      )}

      <Field data-invalid={!!errors.username || undefined}>
        <FieldLabel htmlFor="register-username">Username</FieldLabel>
        <Input
          id="register-username"
          type="text"
          placeholder="alice"
          autoComplete="username"
          aria-invalid={!!errors.username}
          {...register("username")}
        />
        <FieldError errors={errors.username ? [errors.username] : undefined} />
      </Field>

      <Field data-invalid={!!errors.email || undefined}>
        <FieldLabel htmlFor="register-email">Email</FieldLabel>
        <Input
          id="register-email"
          type="email"
          placeholder="user@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        <FieldError errors={errors.email ? [errors.email] : undefined} />
      </Field>

      <Field data-invalid={!!errors.password || undefined}>
        <FieldLabel htmlFor="register-password">Password</FieldLabel>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
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
        {isSubmitting ? "Please wait..." : "Register"}
      </Button>
    </form>
  );
}
