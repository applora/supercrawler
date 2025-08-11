import { type Metadata } from 'next';

import Form from './page.client';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Forgot Password',
  };
};

export default function Page() {
  return <Form />;
}
