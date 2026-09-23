import { type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from '@tanstack/react-router';
import { useRegister } from '@features/auth/hooks/useRegister';
import { useState } from 'react';

export function RegisterForm() {
  const navigate = useNavigate();
  const { submitRegister, error: requestError, reset } = useRegister();

  // const [displayName, setDisplayName] = useState('');
  // const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // const [passwordConfirm, setPasswordConfirm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function submitRegisterForm(e: SubmitEvent): void {
    e.preventDefault();

    // if (password !== passwordConfirm) {
    //   setValidationError('Passwords must be equal.');
    //   return;
    // }
    setValidationError(null);

    reset();
    submitRegister(
      { password, username },
      {
        onSuccess: () =>
          navigate({
            to: '/auth/login',
            state: {
              message: 'Account created successfully',
            } as never,
          }),
      },
    );
  }

  const errorMessage = validationError ?? requestError?.message ?? null;

  return (
    <div className="p-6">
      <Card className="overflow-hidden p-6">
        <CardHeader className="p-0">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Welcome</h1>
            <p className="text-balance text-muted-foreground">Create an account</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={(e) => submitRegisterForm(e)}>
            <FieldGroup>
              {/* <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  required
                  autoComplete="name"
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </Field> */}
              {/* <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field> */}
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="username"
                  required
                  value={username}
                  autoComplete="username"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={passwordConfirm}
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                /> */}
                {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
              </Field>
              <FieldGroup>
                <Field>
                  <Button type="submit">Create Account</Button>
                  {/* <Button variant="outline" type="button">
                    Sign up with Google
                  </Button> */}
                  <FieldDescription className="text-center">
                    Already have an account? <Link to="/auth/login">Login</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
