import { defineConfig } from '@playwright/test';
import { playwrightConfig } from '@repo/testing';

export default defineConfig(playwrightConfig(3002));
