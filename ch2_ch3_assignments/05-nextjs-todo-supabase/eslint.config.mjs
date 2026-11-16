import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// create-next-app 기본 ESLint 설정 (Next.js 권장 규칙 + TypeScript 규칙)
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 빌드 결과물 등은 검사하지 않는다
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
