import { useState, type SubmitEvent } from 'react';
import { Button } from '@ui/button';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@components/ui/input';
import { cn } from 'cn';
import { Link } from '@tanstack/react-router';

export function LoginForm() {
  const { step, submitCredentials, submitMfa, backToCredentials, isPending, error } = useLogin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    if (step === 'credentials') {
      submitCredentials(username, password);
    } else {
      submitMfa(code);
    }
  }

  return (
    <>
      {step === 'credentials' ? (
        <div className="p-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0">
              <form className="p-6" onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Welcome back</h1>
                    <p className="text-balance text-muted-foreground">Log in to your account</p>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="email">Username</FieldLabel>
                    <Input
                      id="username"
                      type="username"
                      placeholder=""
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      disabled={isPending}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                        Forgot your password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isPending}
                      required
                    />
                  </Field>
                  <Field>
                    <Button type="submit" variant="default" disabled={isPending}>
                      {isPending ? 'Sending...' : 'Login'}
                    </Button>
                  </Field>
                  <FieldDescription className="text-center">
                    Don&apos;t have an account? <Link to="/auth/register">Register</Link>
                  </FieldDescription>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="text-sm text-muted-foreground">Enter one-time code from an app.</p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Код подтверждения
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={isPending}
              className={cn(
                'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tracking-widest outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
              )}
            />
          </label>
          <div className="mt-4 flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={backToCredentials} disabled={isPending}>
              Назад
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Sending...' : 'Confirm'}
            </Button>
          </div>
        </form>
      )}

      {error ? <p className="text-sm text-destructive">{describeError(error)}</p> : null}
    </>
  );
}

function describeError(error: unknown): string {
  if (error instanceof Error) return 'Неверные данные или слишком много попыток.';
  return 'Что-то пошло не так.';
}
