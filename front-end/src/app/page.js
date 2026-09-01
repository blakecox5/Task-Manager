'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
      .then(res => {
        if (res.ok) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      });
  }, []);

  return (
    <div className="center-screen">
      <div className="spinner" />
    </div>
  );
}
