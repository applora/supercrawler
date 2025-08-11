'use client';

import Link from 'next/link';
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

export default function ResetPassword() {
  const formSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(2, {
          message: 'Email must be at least 2 characters.',
        }),
      }),
    []
  );

  const onSubmit = async function (values: z.infer<typeof formSchema>) {
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: '/new-password',
    });
    if (!error) {
      toast.success('Email sent!');
    } else {
      toast.error(error.message);
    }
  };

  return (
    <AuthLayout>
      <AuthForm
        formSchema={formSchema}
        submitText="Send Email"
        defaultValues={{ email: '' }}
        // @ts-ignore
        onSubmit={onSubmit}
      >
        <AuthFormHeader title="Reset your password" />
        <AuthFormField label="Email" name="email" type="email" />
        <AuthFormSubmit>Send Email</AuthFormSubmit>
      </AuthForm>
      <div className="text-center text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
}
