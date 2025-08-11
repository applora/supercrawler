'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';
import z from 'zod';

import { authClient } from '@/auth/client';
import AuthForm, {
  AuthFormField,
  AuthFormHeader,
  AuthFormSubmit,
} from '@/components/auth/form';
import AuthLayout from '@/components/auth/layout';

export default function ResetNewPassword() {
  const router = useRouter();

  const formSchema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(2, {
            message: 'Password must be at least 2 characters.',
          }),
          confirm_password: z.string().min(2, {
            message: 'Password must be at least 2 characters.',
          }),
        })
        .refine((data) => data.password === data.confirm_password, {
          message: 'Passwords do not match',
          path: ['confirm_password'],
        }),
    []
  );

  const onSubmit = async function (values: z.infer<typeof formSchema>) {
    const token = new URLSearchParams(window.location.search).get(
      'token'
    ) as string;
    if (!token) {
      toast.error('Invalid token');
    }
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    if (!error) {
      toast.success('Password reset successfully');
      router.push('/login');
    } else {
      toast.error(error.message);
    }
  };

  return (
    <AuthLayout>
      <AuthForm
        formSchema={formSchema}
        submitText="Confirm"
        defaultValues={{ password: '', confirm_password: '' }}
        // @ts-ignore
        onSubmit={onSubmit}
      >
        <AuthFormHeader title="New password"></AuthFormHeader>
        <AuthFormField label="Password" name="password" type="password" />
        <AuthFormField
          label="Confirm Password"
          name="confirm_password"
          type="password"
        />
        <AuthFormSubmit>Confirm</AuthFormSubmit>
      </AuthForm>
    </AuthLayout>
  );
}
