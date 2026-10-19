// ESLint กลางของทุก app (§4.1): Next.js core web vitals + typescript-eslint strict-type-checked + กฎ layering (§3.3)
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

/** @param {string} tsconfigRootDir โฟลเดอร์ของ app (ใช้ import.meta.dirname) */
export function nextAppConfig(tsconfigRootDir) {
  return defineConfig([
    ...nextVitals,
    ...tseslint.configs.strictTypeChecked.map(c => ({ ...c, files: ['**/*.ts', '**/*.tsx'] })),
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        // Server Action ต้องรับ (prevState, formData) แม้ไม่ได้ใช้ — ตั้งชื่อขึ้นต้นด้วย _ เพื่อบอกว่าตั้งใจไม่ใช้
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-console': 'error',
      },
    },
    {
      // §3.3 component ห้าม import ชั้น server โดยตรง — ให้ page ดึงข้อมูลแล้วส่งเป็น props
      files: ['src/components/**'],
      rules: {
        'no-restricted-imports': ['error', { patterns: [{ group: ['@/server/*', '**/server/*'], message: 'ห้าม import ชั้น server ใน component (§3.3)' }] }],
      },
    },
    globalIgnores(['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**', 'coverage/**']),
  ]);
}

/** สำหรับ package TypeScript ที่ไม่ใช่ Next.js */
export function libraryConfig(tsconfigRootDir) {
  return defineConfig([
    ...tseslint.configs.strictTypeChecked.map(c => ({ ...c, files: ['**/*.ts'] })),
    {
      files: ['**/*.ts'],
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
      rules: { 'no-console': 'error' },
    },
    globalIgnores(['coverage/**']),
  ]);
}
