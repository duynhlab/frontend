import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { EmptyState, ErrorState, LineSkeleton } from '@/components/states'
import { getProfile, updateProfile, type Profile } from '@/features/profile/api'
import { useAuth } from '@/hooks/use-auth'
import { auth } from '@/lib/auth'
import { errorCopy } from '@/lib/error-copy'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

const profileKey = ['profile'] as const

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.email('Enter a valid email address'),
  phone: z.string().max(40),
})

function ProfileForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (value: z.infer<typeof schema>) => updateProfile(value),
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKey, updated)
      toast.add({ title: 'Profile saved', type: 'success' })
    },
    onError: (error) =>
      toast.add({
        title: errorCopy(error, 'Your profile could not be saved.'),
        type: 'error',
      }),
  })

  /**
   * Seeded once from the loaded profile and never re-seeded. A background
   * refetch that pushed server values back into the fields would overwrite
   * whatever the shopper was in the middle of typing.
   */
  const form = useForm({
    defaultValues: {
      name: profile.name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => mutation.mutate(value),
  })

  const field = (name: 'name' | 'email' | 'phone', label: string, type = 'text') => (
    <form.Field name={name}>
      {(fieldApi) => (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`profile-${name}`}>{label}</Label>
          <Input
            id={`profile-${name}`}
            type={type}
            value={fieldApi.state.value}
            onChange={(event) => fieldApi.handleChange(event.target.value)}
          />
          {fieldApi.state.meta.errors.map((err, i) => (
            <p key={i} className="text-xs text-destructive-on-tint">
              {(err as { message?: string } | null)?.message ?? 'Invalid value'}
            </p>
          ))}
        </div>
      )}
    </form.Field>
  )

  return (
    <form
      className="flex max-w-md flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-username">Username</Label>
        <Input id="profile-username" value={profile.username} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Your username is managed by the sign-in service and cannot be changed here.
        </p>
      </div>
      {field('name', 'Full name')}
      {field('email', 'Email', 'email')}
      {field('phone', 'Phone')}
      <Button type="submit" className="self-start" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}

function ProfilePage() {
  const { isAuthenticated } = useAuth()

  const query = useQuery(
    queryOptions({
      queryKey: profileKey,
      queryFn: ({ signal }) => getProfile(signal),
      enabled: isAuthenticated,
    }),
  )

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <EmptyState
          title="Sign in to see your profile"
          action={<Button onClick={() => auth.login('/profile')}>Sign in</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
      {query.isPending ? <LineSkeleton rows={4} className="max-w-md" /> : null}
      {query.isError ? (
        <ErrorState
          error={query.error}
          fallback="Your profile could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data ? <ProfileForm profile={query.data} /> : null}
    </div>
  )
}
