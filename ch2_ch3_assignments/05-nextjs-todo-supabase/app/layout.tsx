// [서버 컴포넌트] 루트 레이아웃: 모든 페이지를 감싸는 공통 HTML 뼈대.
// 상호작용(클릭/상태)이 없으므로 'use client' 가 필요 없다.
import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';

// 한국어 웹폰트 (next/font 가 빌드 시 폰트를 내려받아 직접 제공 → 외부 요청 없음)
const notoSansKr = Noto_Sans_KR({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
});

// 브라우저 탭 제목과 설명 (Metadata API)
export const metadata: Metadata = {
  title: 'Supabase Todo',
  description: 'Next.js + Supabase 로 만든 회원별 할 일 관리 앱',
};

// children: 현재 주소에 해당하는 page.tsx 가 이 자리에 들어온다
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body className={notoSansKr.className}>
        <main className="min-h-screen px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
