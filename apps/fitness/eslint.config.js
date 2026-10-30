// ESLint (§4.1): Next.js core web vitals + typescript-eslint strict-type-checked + กฎ layering (§3.3)
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  ...nextVitals,
  ...tseslint.configs.strictTypeChecked.map(c => ({ ...c, files: ['**/*.ts', '**/*.tsx'] })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Server Action ต้องรับ (prevState, formData) แม้ไม่ได้ใช้ — ตั้งชื่อขึ้นต้นด้วย _ เพื่อบอกว่าตั้งใจไม่ใช้
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'error',
    },
  },
  {
    // §3.3 ชั้น web (component/hook/lib) ห้าม import โค้ดฝั่ง server / DAL โดยตรง — ให้หน้า (src/web/app) ดึงข้อมูลแล้วส่งเป็น props
    // api/actions (Server Action), api/services, api/schemas, api/types และ api/lib/utils (logic ล้วน) เรียกได้
    files: ['src/web/**'],
    ignores: ['src/web/app/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{
        group: ['@/api/dal/**', '@/api/lib/db/**', '@/api/lib/clock/**', '@/api/lib/auth/**', '@/api/lib/audit/**', '@/api/lib/theme/**'],
        message: 'ห้าม import ชั้น server หรือ DAL ใน component (§3.3) — ให้หน้าใน src/web/app ดึงข้อมูลแล้วส่ง props',
      }] }],
    },
  },
  globalIgnores(['.next/**', 'src/api/lib/db/db/generated/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**', 'coverage/**']),
]);
