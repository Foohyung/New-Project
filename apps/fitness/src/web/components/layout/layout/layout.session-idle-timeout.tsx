'use client';

import { useEffect } from 'react';
import { refreshSessionActivityAction } from '@/api/actions/auth/auth/auth.actions';
import { SESSION_IDLE_MS } from '@/api/services/auth/auth/auth.service';
import { toast } from '@/web/components/ui/ui/ui.toast';

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
const CHECK_INTERVAL_MS = 15_000;

export function SessionIdleTimeout() {
  useEffect(() => {
    let lastActivityAt = Date.now();
    let lastSyncedActivityAt = 0;
    let lastSyncAttemptAt = 0;
    let syncInProgress = false;
    let stopped = false;
    let errorNotified = false;

    const syncActivity = async (force = false) => {
      const activitySnapshot = lastActivityAt;
      const now = Date.now();
      if (syncInProgress || (!force && (activitySnapshot <= lastSyncedActivityAt || now - lastSyncAttemptAt < CHECK_INTERVAL_MS))) return;
      syncInProgress = true;
      lastSyncAttemptAt = now;
      try {
        const valid = await refreshSessionActivityAction();
        if (stopped) return;
        if (!valid) {
          window.location.replace('/login');
          return;
        }
        lastSyncedActivityAt = activitySnapshot;
        errorNotified = false;
      } catch {
        if (!stopped) {
          if (!errorNotified) {
            toast('ตรวจสอบสถานะการเข้าสู่ระบบไม่สำเร็จ กำลังลองใหม่', 'error');
            errorNotified = true;
          }
          lastSyncAttemptAt = Date.now() - CHECK_INTERVAL_MS;
        }
      } finally {
        syncInProgress = false;
      }
    };

    const recordActivity = () => {
      lastActivityAt = Date.now();
    };

    const checkSession = () => {
      const now = Date.now();
      if (now - lastActivityAt >= SESSION_IDLE_MS) {
        window.location.replace('/login');
        return;
      }
      void syncActivity();
    };

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, recordActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', checkSession);
    const interval = window.setInterval(checkSession, CHECK_INTERVAL_MS);
    void syncActivity(true);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, recordActivity);
      });
      document.removeEventListener('visibilitychange', checkSession);
    };
  }, []);

  return null;
}
