import './globals.css';

export const metadata = {
  title: 'Task List App',
  description: 'Collaborative full-stack task management application built with Next.js, Spring Boot, and MongoDB.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
