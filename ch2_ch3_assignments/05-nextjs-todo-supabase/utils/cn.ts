// Tailwind 클래스 합치기 유틸 (수업에서 배운 cn 함수)
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// clsx: 조건부 클래스(예: { 'line-through': done })를 문자열로 만든다
// twMerge: 'p-2 p-4' 처럼 충돌하는 Tailwind 클래스를 뒤의 것으로 정리한다
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
