import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getUserProfile, updateProfile } from "@/api/userApi";
import { useAuth } from "@/hooks/useAuth";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import PageHeader from "@/components/common/PageHeader";
import LoadingState from "@/components/common/LoadingState";
import AppError from "@/components/common/AppError";
import EmptyState from "@/components/common/EmptyState";
import ApiDebug from "@/components/common/ApiDebug";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/layout/PageShell";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9()\- ]*$/, "Enter a valid phone number"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

/**
 * ProfilePage — view and edit the user profile.
 * API: GET /user/v1/private/users/profile
 * API: PUT /user/v1/private/users/profile
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, requireAuth } = useAuth();

  useEffect(() => {
    requireAuth(navigate, "/profile");
  }, [requireAuth, navigate]);

  const { data: profile, loading, error, mutate } = useApiQuery(
    isAuthenticated ? "user-profile" : null,
    getUserProfile,
  );

  const { mutate: saveProfile, loading: saving } = useApiMutation(updateProfile, {
    successMessage: "Profile updated",
    errorMessage: "Cannot update profile",
  });

  const [editMode, setEditMode] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // `values` keeps the form in sync when the profile (re)loads.
    values: { name: profile?.name || "", phone: profile?.phone || "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveProfile(values);
    if (result) {
      setEditMode(false);
      void mutate(); // Refresh profile data
    }
  });

  const handleCancel = () => {
    reset({ name: profile?.name || "", phone: profile?.phone || "" });
    setEditMode(false);
  };

  if (!isAuthenticated) {
    return (
      <PageShell>
        <PageHeader title="My Profile" backLink="/" backText="← Back to Home" />
        <EmptyState message="Please log in to view your profile" icon="🔒" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="My Profile"
        backLink="/"
        backText="← Back to Home"
        apiLabel="API: GET /user/v1/private/users/profile"
      />

      {loading && <LoadingState message="Loading profile..." />}

      {!loading && error && (
        <AppError
          error={error}
          endpoint="GET /user/v1/private/users/profile"
          onRetry={() => void mutate()}
        />
      )}

      {!loading && !error && profile && (
        <Card className="max-w-xl">
          <CardContent className="pt-6">
            {!editMode ? (
              <div className="space-y-3">
                <dl className="space-y-2 text-sm">
                  {(
                    [
                      ["User ID", profile.id || "N/A"],
                      ["Username", profile.username || "N/A"],
                      ["Email", profile.email || "N/A"],
                      ["Name", profile.name || "Not set"],
                      ["Phone", profile.phone || "Not set"],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Button type="button" onClick={() => setEditMode(true)}>
                  Edit Profile
                </Button>
              </div>
            ) : (
              <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
                <Field data-invalid={!!errors.name || undefined}>
                  <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                  <Input
                    id="profile-name"
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  <FieldError errors={errors.name ? [errors.name] : undefined} />
                </Field>

                <Field data-invalid={!!errors.phone || undefined}>
                  <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
                  <Input
                    id="profile-phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    aria-invalid={!!errors.phone}
                    {...register("phone")}
                  />
                  <FieldError errors={errors.phone ? [errors.phone] : undefined} />
                </Field>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} aria-busy={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <ApiDebug data={profile} />
    </PageShell>
  );
}
