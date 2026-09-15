import { useState, type FormEvent } from 'react';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Field, FieldGroup, FieldLabel } from '@ui/field';

interface MfaFormProps {
  onSubmit: (code: string) => void;
  onCancel?: () => void;
  isPending?: boolean;
}

export function MfaForm({ onSubmit, onCancel, isPending }: MfaFormProps) {
  const [code, setCode] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(code);
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="mfa-code">Код подтверждения</FieldLabel>
          <Input
            id="mfa-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            disabled={isPending}
            className="tracking-widest"
          />
        </Field>
        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
              Отмена
            </Button>
          ) : null}
          <Button type="submit" className="flex-1" disabled={isPending}>
            Подтвердить
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
