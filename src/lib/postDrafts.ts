import { useEffect, useRef, useState, useCallback } from "react";
import { getCurrentUserId } from "@/lib/authCache";

/**
 * Persistent draft system for the Upload / Create Post flow.
 *
 * Why this exists:
 *   The Upload form was losing all data — caption, role, salary, recorded video —
 *   whenever React remounted the form (mode hook resolving, tab switch, hot
 *   reload, route flicker). Users would record a video, fill in the form, and
 *   then watch it disappear.
 *
 * What it does:
 *   - Stores form fields in localStorage, scoped per (userId, draftId).
 *   - Stores the selected video file in IndexedDB (Blobs cannot live in
 *     localStorage).
 *   - Restores everything on mount, including across full page refreshes.
 *   - Only clears when the user explicitly cancels or after a successful
 *     submit — never on remount, tab switch, or video selection.
 */

const DB_NAME = "hr_post_drafts";
const STORE = "videos";
const DB_VERSION = 1;
const LS_PREFIX = "hr_draft_v1::";

const draftKey = (userId: string | null, draftId: string) =>
  `${LS_PREFIX}${userId ?? "anon"}::${draftId}`;

const videoKey = (userId: string | null, draftId: string) =>
  `${userId ?? "anon"}::${draftId}`;

// ---------------- IndexedDB (videos) ----------------

let dbPromise: Promise<IDBDatabase | null> | null = null;
const openDb = (): Promise<IDBDatabase | null> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
};

interface StoredVideo {
  blob: Blob;
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

async function putVideo(key: string, file: File): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const stored: StoredVideo = {
        blob: file,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      };
      tx.objectStore(STORE).put(stored, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function getVideo(key: string): Promise<File | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const v = req.result as StoredVideo | undefined;
        if (!v || !v.blob) return resolve(null);
        try {
          const file = new File([v.blob], v.name || "video", {
            type: v.type || "video/webm",
            lastModified: v.lastModified || Date.now(),
          });
          resolve(file);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function deleteVideo(key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ---------------- React hook ----------------

function fieldsDifferFromInitial<T extends object>(fields: T, initial: T): boolean {
  return (Object.keys(initial) as (keyof T)[]).some((key) => {
    const current = fields[key];
    const base = initial[key];
    if (Array.isArray(base)) {
      return Array.isArray(current) && current.length > 0;
    }
    return current !== base;
  });
}

/**
 * Persistent form draft hook.
 *
 * @param draftId   Stable identifier for this form (e.g. "hiring", "open_to_work").
 * @param initial   Default field values when no draft exists.
 */
export function usePostDraft<T extends object>(
  draftId: string,
  initial: T,
) {
  const userId = getCurrentUserId();
  const lsKey = draftKey(userId, draftId);
  const vKey = videoKey(userId, draftId);

  const readStoredFields = (): Partial<T> | null => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) return null;
      return JSON.parse(raw) as Partial<T>;
    } catch {
      return null;
    }
  };

  // Synchronously read fields from localStorage on first render — avoids the
  // initial empty-state flash that caused users to think their data was gone.
  const [fields, setFieldsState] = useState<T>(() => {
    const stored = readStoredFields();
    if (stored) return { ...initial, ...stored };
    return initial;
  });

  const [video, setVideoState] = useState<File | null>(null);
  const [ready, setReady] = useState(false);
  const [restoredFromDraft, setRestoredFromDraft] = useState(() => {
    const stored = readStoredFields();
    if (stored && fieldsDifferFromInitial({ ...initial, ...stored }, initial)) return true;
    return false;
  });

  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  // Restore the video file from IndexedDB on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const f = await getVideo(vKey);
      if (cancelled) return;
      if (f) {
        setVideoState(f);
        setRestoredFromDraft(true);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [vKey]);

  // Debounced persistence of fields.
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (fieldsDifferFromInitial(fieldsRef.current, initial)) {
          localStorage.setItem(lsKey, JSON.stringify(fieldsRef.current));
        } else {
          localStorage.removeItem(lsKey);
        }
      } catch {}
    }, 200);
    return () => window.clearTimeout(t);
  }, [fields, lsKey, initial]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFieldsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFields = useCallback((patch: Partial<T>) => {
    setFieldsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setVideo = useCallback(
    (f: File | null) => {
      setVideoState(f);
      if (f) void putVideo(vKey, f);
      else void deleteVideo(vKey);
    },
    [vKey],
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(lsKey);
    } catch {}
    void deleteVideo(vKey);
    setFieldsState(initial);
    setVideoState(null);
    setRestoredFromDraft(false);
  }, [lsKey, vKey, initial]);

  return { fields, setField, setFields, video, setVideo, clear, ready, restoredFromDraft };
}
