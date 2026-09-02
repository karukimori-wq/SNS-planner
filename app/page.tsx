"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Tab =
  | "home"
  | "calendar"
  | "posts"
  | "drafts"
  | "briefs"
  | "metadata"
  | "create"
  | "media"
  | "apps";
type IconName =
  | "home"
  | "calendar"
  | "posts"
  | "drafts"
  | "plus"
  | "media"
  | "apps"
  | "search"
  | "chart"
  | "settings"
  | "chevronLeft"
  | "chevronRight"
  | "x"
  | "image"
  | "clock"
  | "more";

type AppDefinition = {
  id: string;
  name: string;
  short: string;
  color: string;
  soft: string;
  tagSuggestions?: string[];
};
const defaultApps: AppDefinition[] = [
  {
    id: "all",
    name: "すべて",
    short: "ALL",
    color: "#635bff",
    soft: "#eeecff",
  },
  {
    id: "numeria",
    name: "Numeria Studio",
    short: "Nu",
    color: "#8a5cf6",
    soft: "#f1eafe",
  },
  {
    id: "tukuttee",
    name: "tukuttee",
    short: "te",
    color: "#f17891",
    soft: "#fff0f3",
  },
  {
    id: "tukuttaa",
    name: "tukuttaa",
    short: "ta",
    color: "#35a986",
    soft: "#e9f8f3",
  },
];
let apps = defaultApps;
type AppOverrides = Record<string, Partial<AppDefinition> & { deleted?: boolean }>;

type GrowthRequestHistory = {
  id: number;
  savedAt: string;
  title: string;
  raw: string;
};

type MessageDraft = {
  id: number;
  messageDraftId: string;
  messageDraftStatus?: string;
  workspaceId: string;
  userId: string;
  sourceApp?: string;
  targetStudio: string;
  channel: string;
  purpose: string;
  audienceSegment: string;
  tone: string;
  cta: string;
  inputRef: Record<string, string>;
  generatedText: string;
  eventName?: string;
  traceId?: string;
  correlationId?: string;
  requestId?: string;
  variants: Array<{
    variantId: string;
    label: string;
    text: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type PostFilters = {
  query: string;
  platform: string;
  status: string;
  start: string;
  end: string;
};
const emptyFilters: PostFilters = {
  query: "",
  platform: "all",
  status: "all",
  start: "",
  end: "",
};

type Post = {
  id: number;
  workspaceId?: string;
  userId?: string;
  ownerUserId?: string;
  day: string;
  date: string;
  isoDate?: string;
  time: string;
  app: string;
  status: string;
  text: string;
  tags: string[];
  visual: string;
  mediaTags?: string[];
  imagePrompt?: string;
  reelScript?: string;
  storyIdea?: string;
  memo?: string;
  platform?: string;
  postedAt?: string;
  mediaIds?: number[];
};

type MediaAsset = {
  id: number;
  name: string;
  mimeType: string;
  size: number;
  appId: string;
  createdAt: string;
  url: string;
};
type StoredMediaAsset = Omit<MediaAsset, "url"> & { blob: Blob };

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("sns-planner-media", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("assets"))
        request.result.createObjectStore("assets", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadStoredMedia(): Promise<MediaAsset[]> {
  const db = await openMediaDb();
  const records = await new Promise<StoredMediaAsset[]>((resolve, reject) => {
    const request = db
      .transaction("assets", "readonly")
      .objectStore("assets")
      .getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return records
    .map(({ blob, ...item }) => ({ ...item, url: URL.createObjectURL(blob) }))
    .sort((a, b) => b.id - a.id);
}

async function storeMedia(file: File, appId: string): Promise<MediaAsset> {
  const item: StoredMediaAsset = {
    id: Date.now(),
    name: file.name,
    mimeType: file.type,
    size: file.size,
    appId,
    createdAt: new Date().toISOString(),
    blob: file,
  };
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const request = db
      .transaction("assets", "readwrite")
      .objectStore("assets")
      .put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
  return { ...item, url: URL.createObjectURL(file) };
}

async function removeStoredMedia(id: number) {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const request = db
      .transaction("assets", "readwrite")
      .objectStore("assets")
      .delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function replaceStoredMedia(items: StoredMediaAsset[]) {
  const db = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("assets", "readwrite");
    const store = transaction.objectStore("assets");
    store.clear();
    items.forEach((item) => store.put(item));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const initialPosts: Post[] = [
  {
    id: 1,
    day: "今日",
    date: "7月15日（水）",
    isoDate: "2026-07-15",
    time: "18:00",
    app: "numeria",
    status: "投稿待ち",
    text: "数秘術の鑑定書作成に時間がかかっていませんか？ Numeria Studioなら、計算から鑑定書作成までをひとつに。",
    tags: ["数秘術", "占い師"],
    visual: "numeria",
    platform: "X",
  },
  {
    id: 2,
    day: "木",
    date: "7月16日（木）",
    isoDate: "2026-07-16",
    time: "12:30",
    app: "tukuttee",
    status: "作成中",
    text: "『こんなアプリがあったらいいな』を投稿して、欲しい人と作る人をつなげます。あなたのアイデアを聞かせてください。",
    tags: ["個人開発", "アイデア"],
    visual: "tukuttee",
    platform: "X",
  },
  {
    id: 3,
    day: "土",
    date: "7月18日（土）",
    isoDate: "2026-07-18",
    time: "20:00",
    app: "tukuttaa",
    status: "アイデア",
    text: "作る前に、欲しい人がいるか分かる。個人開発の最初の一歩をもっと確かなものに。",
    tags: ["アプリ開発", "MVP"],
    visual: "tukuttaa",
    platform: "X",
  },
];

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    posts: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </>
    ),
    drafts: (
      <>
        <path d="M7 4h8l4 4v12H7z" />
        <path d="M15 4v4h4M10 12h6M10 16h5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    media: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="2" />
        <path d="m4 17 5-4 3 3 3-2 5 4" />
      </>
    ),
    apps: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 13.5v-3l-2-.5a7 7 0 0 0-1-1.8l.6-2-2.6-1.5-1.4 1.5a8 8 0 0 0-2.2 0L9 4.7 6.4 6.2l.6 2A7 7 0 0 0 6 10l-2 .5v3l2 .5a7 7 0 0 0 1 1.8l-.6 2L9 19.3l1.4-1.5a8 8 0 0 0 2.2 0l1.4 1.5 2.6-1.5-.6-2a7 7 0 0 0 1-1.8z" />
      </>
    ),
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    x: <path d="M5 4l14 16M19 4 5 20" />,
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="m5 17 5-5 3 3 2-2 4 4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function AppBadge({
  appId,
  size = "md",
}: {
  appId: string;
  size?: "sm" | "md" | "lg";
}) {
  const app = apps.find((item) => item.id === appId) ?? apps[0];
  return (
    <span
      className={`app-badge ${size}`}
      style={{ background: app.soft, color: app.color }}
    >
      {app.short}
    </span>
  );
}

function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value}</span>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [selectedApp, setSelectedApp] = useState("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [showComposer, setShowComposer] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filters, setFilters] = useState<PostFilters>(emptyFilters);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [messageDrafts, setMessageDrafts] = useState<MessageDraft[]>([]);
  const [actionNotice, setActionNotice] = useState("");
  const [appProfiles, setAppProfiles] =
    useState<Record<string, PromptAppInfo>>(appPromptProfiles);
  const [growthRequestHistory, setGrowthRequestHistory] = useState<
    GrowthRequestHistory[]
  >([]);
  const [storageReady, setStorageReady] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [customApps, setCustomApps] = useState<AppDefinition[]>([]);
  const [appOverrides, setAppOverrides] = useState<AppOverrides>({});
  apps = [
    ...defaultApps
      .filter((app) => !appOverrides[app.id]?.deleted)
      .map((app) => ({ ...app, ...appOverrides[app.id] })),
    ...customApps,
  ];

  useEffect(() => {
    try {
      const savedProfiles = window.localStorage.getItem(
        "sns-planner-app-profiles",
      );
      const savedPosts = window.localStorage.getItem("sns-planner-posts");
      const savedApps = window.localStorage.getItem("sns-planner-custom-apps");
      const savedOverrides = window.localStorage.getItem(
        "sns-planner-app-overrides",
      );
      const savedGrowthRequests = window.localStorage.getItem(
        "sns-planner-growth-requests",
      );
      const savedMessageDrafts = window.localStorage.getItem(
        "sns-planner-message-drafts",
      );
      if (savedProfiles)
        setAppProfiles((current) => ({
          ...current,
          ...JSON.parse(savedProfiles),
        }));
      if (savedPosts) {
        const parsed = JSON.parse(savedPosts);
        if (Array.isArray(parsed)) setPosts(parsed);
      }
      if (savedApps) {
        const parsed = JSON.parse(savedApps);
        if (Array.isArray(parsed)) setCustomApps(parsed);
      }
      if (savedOverrides) {
        const parsed = JSON.parse(savedOverrides);
        if (parsed && typeof parsed === "object") setAppOverrides(parsed);
      }
      if (savedGrowthRequests) {
        const parsed = JSON.parse(savedGrowthRequests);
        if (Array.isArray(parsed)) setGrowthRequestHistory(parsed);
      }
      if (savedMessageDrafts) {
        const parsed = JSON.parse(savedMessageDrafts);
        if (Array.isArray(parsed)) setMessageDrafts(parsed);
      }
      window.localStorage.removeItem("sns-planner-session");
    } catch {
      // 保存データを読めない場合は初期情報を使用する
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    loadStoredMedia()
      .then(setMediaAssets)
      .catch(() => setMediaAssets([]));
  }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const updateViewportHeight = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      root.style.setProperty("--app-viewport-height", `${height}px`);
    };
    const keepFocusedFieldVisible = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches("input, textarea, select")) return;
      const scrollRoot = target.closest(
        ".composer-body, .bulk-body, .profile-editor-body",
      );
      if (!(scrollRoot instanceof HTMLElement)) return;
      window.setTimeout(() => {
        const rootRect = scrollRoot.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const bottomLimit = rootRect.bottom - 160;
        const topLimit = rootRect.top + 72;
        if (targetRect.bottom > bottomLimit) {
          scrollRoot.scrollBy({
            top: targetRect.bottom - bottomLimit,
            behavior: "smooth",
          });
        } else if (targetRect.top < topLimit) {
          scrollRoot.scrollBy({
            top: targetRect.top - topLimit,
            behavior: "smooth",
          });
        }
      }, 120);
    };

    updateViewportHeight();
    window.visualViewport?.addEventListener("resize", updateViewportHeight);
    window.visualViewport?.addEventListener("scroll", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);
    document.addEventListener("focusin", keepFocusedFieldVisible);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewportHeight);
      window.visualViewport?.removeEventListener("scroll", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
      document.removeEventListener("focusin", keepFocusedFieldVisible);
      root.style.removeProperty("--app-viewport-height");
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem("sns-planner-posts", JSON.stringify(posts));
  }, [posts, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(
      "sns-planner-message-drafts",
      JSON.stringify(messageDrafts),
    );
  }, [messageDrafts, storageReady]);

  useEffect(() => {
    if (!actionNotice) return;
    const timeoutId = window.setTimeout(() => setActionNotice(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [actionNotice]);

  const saveAppProfile = (appId: string, profile: PromptAppInfo) => {
    setAppProfiles((current) => {
      const next = { ...current, [appId]: profile };
      window.localStorage.setItem(
        "sns-planner-app-profiles",
        JSON.stringify(next),
      );
      return next;
    });
  };

  const saveGrowthRequestHistory = (item: GrowthRequestHistory) => {
    setGrowthRequestHistory((current) => {
      const next = [item, ...current.filter((entry) => entry.raw !== item.raw)].slice(
        0,
        20,
      );
      window.localStorage.setItem(
        "sns-planner-growth-requests",
        JSON.stringify(next),
      );
      return next;
    });
  };

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        if (selectedApp !== "all" && post.app !== selectedApp) return false;
        const appName = apps.find((app) => app.id === post.app)?.name ?? "";
        const haystack =
          `${post.text} ${post.tags.join(" ")} ${appName}`.toLowerCase();
        if (filters.query && !haystack.includes(filters.query.toLowerCase()))
          return false;
        if (
          filters.platform !== "all" &&
          (post.platform ?? "X") !== filters.platform
        )
          return false;
        if (filters.status !== "all" && post.status !== filters.status)
          return false;
        if (filters.start && (!post.isoDate || post.isoDate < filters.start))
          return false;
        if (filters.end && (!post.isoDate || post.isoDate > filters.end))
          return false;
        return true;
      }),
    [posts, selectedApp, filters, customApps],
  );

  const switchTab = (next: Tab) => {
    if (next === "create") {
      setEditingPost(null);
      setShowComposer(true);
      return;
    }
    setTab(next);
  };

  const openX = (text: string) => {
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openComposer = (post?: Post) => {
    setEditingPost(post ?? null);
    setShowComposer(true);
  };

  return (
    <main className="site-shell">
      <section className={`phone-app ${tab === "home" ? "home-tab" : ""}`}>
        <header className="topbar">
          <div>
            <p className="eyebrow">文章作成ツール</p>
            <h1>SNS Planner</h1>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label="検索"
              onClick={() => setShowSearch(true)}
            >
              <Icon name="search" />
            </button>
            <button
              className="icon-button"
              aria-label="設定"
              onClick={() => setShowSettings(true)}
            >
              <Icon name="settings" />
            </button>
          </div>
        </header>

        {tab !== "home" && (
          <section className="quick-actions" aria-label="よく使う操作">
            <button className="quick-primary" onClick={() => openComposer()}>
              投稿を作る
            </button>
            <button onClick={() => setTab("drafts")}>下書き</button>
          </section>
        )}
        {actionNotice && (
          <div className="action-notice" role="status">
            <strong>保存しました</strong>
            <span>{actionNotice}</span>
          </div>
        )}

        <div className="content-scroll">
          {tab === "home" && (
            <PlannerHome
              posts={posts}
              requestHistory={growthRequestHistory}
              onCreatePost={() => openComposer()}
              onOpenDrafts={() => setTab("drafts")}
              onOpenBriefs={() => setTab("briefs")}
              onOpenMetadata={() => setTab("metadata")}
              onOpenMedia={() => setTab("media")}
              onOpenApps={() => setTab("apps")}
              onOpenSettings={() => setShowSettings(true)}
              onBulkImport={() => setShowBulkImport(true)}
            />
          )}
          {tab === "calendar" && (
            <CalendarView
              posts={filteredPosts}
              selectedApp={selectedApp}
              setSelectedApp={setSelectedApp}
              onPreview={setSelectedPost}
              onEdit={openComposer}
              onCreate={() => openComposer()}
            />
          )}
          {tab === "posts" && (
            <PostsView
              posts={filteredPosts}
              selectedApp={selectedApp}
              setSelectedApp={setSelectedApp}
              view={view}
              setView={setView}
              onPreview={setSelectedPost}
              onEdit={openComposer}
              onBulkImport={() => setShowBulkImport(true)}
              onFilter={() => setShowSearch(true)}
              filters={filters}
            />
          )}
          {tab === "drafts" && (
            <DraftsView
              posts={posts}
              messageDrafts={messageDrafts}
              onCreatePost={() => openComposer()}
              onEditPost={openComposer}
              onDeletePost={(id) =>
                setPosts((current) => current.filter((post) => post.id !== id))
              }
              onDeleteMessage={(id) =>
                setMessageDrafts((current) =>
                  current.filter((draft) => draft.id !== id),
                )
              }
            />
          )}
          {tab === "briefs" && (
            <GrowthBriefsView
              requestHistory={growthRequestHistory}
              onBulkImport={() => setShowBulkImport(true)}
            />
          )}
          {tab === "metadata" && <MetadataView />}
          {tab === "media" && (
            <MediaView
              selectedApp={selectedApp}
              setSelectedApp={setSelectedApp}
              assets={mediaAssets}
              onUpload={async (file, appId) => {
                const asset = await storeMedia(file, appId);
                setMediaAssets((current) => [asset, ...current]);
              }}
              onDelete={async (asset) => {
                await removeStoredMedia(asset.id);
                URL.revokeObjectURL(asset.url);
                setMediaAssets((current) =>
                  current.filter((item) => item.id !== asset.id),
                );
                setPosts((current) =>
                  current.map((post) => ({
                    ...post,
                    mediaIds: post.mediaIds?.filter((id) => id !== asset.id),
                  })),
                );
              }}
            />
          )}
          {tab === "apps" && (
            <AppsView
              profiles={appProfiles}
              onSaveProfile={saveAppProfile}
              onCreate={() => openComposer()}
              onAdd={(app, profile) => {
                const next = [...customApps, app];
                setCustomApps(next);
                window.localStorage.setItem(
                  "sns-planner-custom-apps",
                  JSON.stringify(next),
                );
                saveAppProfile(app.id, profile);
              }}
              onUpdateApp={(appId, nextApp) => {
                if (customApps.some((app) => app.id === appId)) {
                  const next = customApps.map((app) =>
                    app.id === appId ? { ...app, ...nextApp } : app,
                  );
                  setCustomApps(next);
                  window.localStorage.setItem(
                    "sns-planner-custom-apps",
                    JSON.stringify(next),
                  );
                  return;
                }
                const next = {
                  ...appOverrides,
                  [appId]: { ...appOverrides[appId], ...nextApp },
                };
                setAppOverrides(next);
                window.localStorage.setItem(
                  "sns-planner-app-overrides",
                  JSON.stringify(next),
                );
              }}
              onDelete={(id) => {
                if (customApps.some((app) => app.id === id)) {
                  const next = customApps.filter((app) => app.id !== id);
                  setCustomApps(next);
                  window.localStorage.setItem(
                    "sns-planner-custom-apps",
                    JSON.stringify(next),
                  );
                } else {
                  const next = {
                    ...appOverrides,
                    [id]: { ...appOverrides[id], deleted: true },
                  };
                  setAppOverrides(next);
                  window.localStorage.setItem(
                    "sns-planner-app-overrides",
                    JSON.stringify(next),
                  );
                }
                setPosts((current) =>
                  current.filter((post) => post.app !== id),
                );
                setSelectedApp("all");
              }}
            />
          )}
        </div>

        <nav className="bottom-nav" aria-label="メインメニュー">
          <NavButton
            active={tab === "home"}
            label="ホーム"
            icon="home"
            onClick={() => switchTab("home")}
          />
          <NavButton
            active={tab === "posts"}
            label="投稿"
            icon="posts"
            onClick={() => switchTab("posts")}
          />
          <button
            className="create-nav"
            aria-label="作成メニュー"
            onClick={() => switchTab("create")}
          >
            <Icon name="plus" size={28} />
            <span>作成</span>
          </button>
          <NavButton
            active={tab === "drafts"}
            label="下書き"
            icon="drafts"
            onClick={() => switchTab("drafts")}
          />
          <NavButton
            active={tab === "media"}
            label="素材"
            icon="media"
            onClick={() => switchTab("media")}
          />
        </nav>
      </section>

      {showComposer && (
        <Composer
          initialPost={editingPost}
          mediaAssets={mediaAssets}
          appProfiles={appProfiles}
          onClose={() => setShowComposer(false)}
          onBulkImport={() => {
            setShowComposer(false);
            setShowBulkImport(true);
          }}
          onSave={(saved) => {
            setPosts((current) =>
              editingPost
                ? current.map((post) =>
                    post.id === editingPost.id ? { ...post, ...saved } : post,
                  )
                : [{ ...saved, id: Date.now() }, ...current],
            );
            setShowComposer(false);
            setEditingPost(null);
            setTab("drafts");
            setActionNotice("投稿を下書き一覧に追加しました。");
          }}
          onDelete={
            editingPost
              ? () => {
                  setPosts((current) =>
                    current.filter((post) => post.id !== editingPost.id),
                  );
                  setShowComposer(false);
                  setEditingPost(null);
                }
              : undefined
          }
        />
      )}
      {showSearch && (
        <SearchModal
          filters={filters}
          resultCount={filteredPosts.length}
          onClose={() => setShowSearch(false)}
          onApply={(next) => {
            setFilters(next);
            setShowSearch(false);
            setTab("posts");
          }}
        />
      )}
      {showBulkImport && (
        <BulkImport
          profiles={appProfiles}
          requestHistory={growthRequestHistory}
          onSaveProfile={saveAppProfile}
          onSaveRequest={saveGrowthRequestHistory}
          onClose={() => setShowBulkImport(false)}
          onImport={(newPosts) => {
            setPosts((current) => [...newPosts, ...current]);
            setShowBulkImport(false);
            setTab("posts");
          }}
        />
      )}
      {showSettings && (
        <SettingsModal
          posts={posts}
          profiles={appProfiles}
          mediaAssets={mediaAssets}
          customApps={customApps}
          appOverrides={appOverrides}
          growthRequestHistory={growthRequestHistory}
          messageDrafts={messageDrafts}
          onClose={() => setShowSettings(false)}
          onRestore={async (
            nextPosts,
            nextProfiles,
            nextApps,
            nextOverrides,
            nextMedia,
            nextGrowthRequestHistory,
            nextMessageDrafts,
          ) => {
            setPosts(nextPosts);
            setAppProfiles(nextProfiles);
            setCustomApps(nextApps);
            setAppOverrides(nextOverrides);
            setGrowthRequestHistory(nextGrowthRequestHistory);
            setMessageDrafts(nextMessageDrafts);
            window.localStorage.setItem(
              "sns-planner-app-profiles",
              JSON.stringify(nextProfiles),
            );
            window.localStorage.setItem(
              "sns-planner-custom-apps",
              JSON.stringify(nextApps),
            );
            window.localStorage.setItem(
              "sns-planner-app-overrides",
              JSON.stringify(nextOverrides),
            );
            window.localStorage.setItem(
              "sns-planner-growth-requests",
              JSON.stringify(nextGrowthRequestHistory),
            );
            window.localStorage.setItem(
              "sns-planner-message-drafts",
              JSON.stringify(nextMessageDrafts),
            );
            await replaceStoredMedia(nextMedia);
            setMediaAssets(await loadStoredMedia());
          }}
          onReset={async () => {
            setPosts(initialPosts);
            setAppProfiles(appPromptProfiles);
            setCustomApps([]);
            setAppOverrides({});
            setGrowthRequestHistory([]);
            setMessageDrafts([]);
            await replaceStoredMedia([]);
            setMediaAssets([]);
            window.localStorage.removeItem("sns-planner-posts");
            window.localStorage.removeItem("sns-planner-app-profiles");
            window.localStorage.removeItem("sns-planner-custom-apps");
            window.localStorage.removeItem("sns-planner-app-overrides");
            window.localStorage.removeItem("sns-planner-growth-requests");
            window.localStorage.removeItem("sns-planner-message-drafts");
          }}
        />
      )}
      {selectedPost && (
        <PostPublishModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onOpenX={openX}
          onMarkPosted={() => {
            setPosts((current) =>
              current.map((post) =>
                post.id === selectedPost.id
                  ? {
                      ...post,
                      status: "投稿済み",
                      postedAt: new Date().toISOString(),
                    }
                  : post,
              ),
            );
            setSelectedPost(null);
          }}
        />
      )}
    </main>
  );
}

type BackupData = {
  format: "sns-planner-backup";
  version: 1 | 2 | 3 | 4;
  exported_at: string;
  posts: Post[];
  app_profiles: Record<string, PromptAppInfo>;
  custom_apps?: AppDefinition[];
  app_overrides?: AppOverrides;
  growth_request_history?: GrowthRequestHistory[];
  message_drafts?: MessageDraft[];
  media?: Array<Omit<StoredMediaAsset, "blob"> & { data: string }>;
};

function withoutBusinessMetrics(post: Post & { metrics?: unknown }): Post {
  const { metrics: _metrics, ...draft } = post;
  return draft;
}

function SettingsModal({
  posts,
  profiles,
  mediaAssets,
  customApps,
  appOverrides,
  growthRequestHistory,
  messageDrafts,
  onClose,
  onRestore,
  onReset,
}: {
  posts: Post[];
  profiles: Record<string, PromptAppInfo>;
  mediaAssets: MediaAsset[];
  customApps: AppDefinition[];
  appOverrides: AppOverrides;
  growthRequestHistory: GrowthRequestHistory[];
  messageDrafts: MessageDraft[];
  onClose: () => void;
  onRestore: (
    posts: Post[],
    profiles: Record<string, PromptAppInfo>,
    apps: AppDefinition[],
    overrides: AppOverrides,
    media: StoredMediaAsset[],
    growthRequestHistory: GrowthRequestHistory[],
    messageDrafts: MessageDraft[],
  ) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<BackupData | null>(null);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "restore" | "reset" | null
  >(null);
  const [done, setDone] = useState("");
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  useEffect(() => {
    setLastBackup(window.localStorage.getItem("sns-planner-last-backup"));
    navigator.storage
      ?.estimate()
      .then((value) =>
        setStorageUsage({ usage: value.usage ?? 0, quota: value.quota ?? 0 }),
      )
      .catch(() => undefined);
  }, []);

  const backupAge = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)
    : null;
  const backupRecommended = backupAge === null || backupAge >= 7;
  const formatBytes = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;

  const exportBackup = async () => {
    setDone("バックアップを作成しています…");
    const media = await Promise.all(
      mediaAssets.map(async ({ url, ...asset }) => ({
        ...asset,
        data: await blobToDataUrl(
          await fetch(url).then((response) => response.blob()),
        ),
      })),
    );
    const data: BackupData = {
      format: "sns-planner-backup",
      version: 4,
      exported_at: new Date().toISOString(),
      posts: posts.map(withoutBusinessMetrics),
      app_profiles: profiles,
      custom_apps: customApps,
      app_overrides: appOverrides,
      growth_request_history: growthRequestHistory,
      message_drafts: messageDrafts,
      media,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sns-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const savedAt = new Date().toISOString();
    window.localStorage.setItem("sns-planner-last-backup", savedAt);
    setLastBackup(savedAt);
    setDone("バックアップを書き出しました。");
  };

  const readBackup = async (file?: File) => {
    setError("");
    setDone("");
    setPreview(null);
    setConfirmAction(null);
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<BackupData>;
      if (
        parsed.format !== "sns-planner-backup" ||
        ![1, 2, 3, 4].includes(Number(parsed.version)) ||
        !Array.isArray(parsed.posts) ||
        !parsed.app_profiles ||
        typeof parsed.app_profiles !== "object"
      )
        throw new Error();
      setPreview(parsed as BackupData);
    } catch {
      setError("SNS Plannerのバックアップファイルを確認してください。");
    }
  };

  return (
    <div className="modal-backdrop">
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="設定とバックアップ"
      >
        <header>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            <Icon name="chevronLeft" />
          </button>
          <div>
            <p className="eyebrow">SETTINGS</p>
            <h2>設定・バックアップ</h2>
          </div>
        </header>
        <div className="settings-body">
          <section
            className={`storage-status ${backupRecommended ? "needs-backup" : "safe"}`}
          >
            <div>
              <span>{backupRecommended ? "!" : "✓"}</span>
              <div>
                <strong>
                  {backupRecommended
                    ? "バックアップを保存してください"
                    : "データは保護されています"}
                </strong>
                <p>
                  {lastBackup
                    ? `最終バックアップ：${new Date(lastBackup).toLocaleString("ja-JP")}`
                    : "まだバックアップが作成されていません"}
                </p>
              </div>
            </div>
            <dl>
              <div>
                <dt>端末内の使用量</dt>
                <dd>
                  {storageUsage ? formatBytes(storageUsage.usage) : "確認中"}
                </dd>
              </div>
              <div>
                <dt>保存方式</dt>
                <dd>この端末のみ</dd>
              </div>
            </dl>
          </section>
          <section className="settings-card final-check-card">
            <div className="settings-card-title">
              <span>OK</span>
              <div>
                <h3>完成チェック</h3>
                <p>iPhoneで使う前に確認する項目です。</p>
              </div>
            </div>
            <ul className="final-check-list">
              <li>入力欄は拡大されにくい文字サイズに調整済み</li>
              <li>作成画面はキーボード表示中も下まで移動しやすい余白を確保</li>
              <li>下部メニューはiPhoneの安全領域を避ける配置</li>
              <li>投稿、連絡文、下書き、バックアップ、API確認をテスト対象に含めています</li>
            </ul>
          </section>
          <section className="settings-card">
            <div className="settings-card-title">
              <span>↓</span>
              <div>
                <h3>完全バックアップを書き出す</h3>
                <p>
                  投稿・コンテンツ情報・画像・動画を1つのJSONファイルに保存します。
                </p>
              </div>
            </div>
            <div className="backup-counts">
              <span>
                <strong>{posts.length}</strong>投稿
              </span>
              <span>
                <strong>{Object.keys(profiles).length}</strong>コンテンツ
              </span>
              <span>
                <strong>{mediaAssets.length}</strong>素材
              </span>
              <span>
                <strong>{messageDrafts.length}</strong>文案
              </span>
            </div>
            <button className="settings-primary" onClick={exportBackup}>
              JSONファイルを書き出す
            </button>
          </section>
          <section className="settings-card">
            <div className="settings-card-title">
              <span>↑</span>
              <div>
                <h3>バックアップから復元</h3>
                <p>復元前にファイルの内容を確認できます。</p>
              </div>
            </div>
            <label className="file-picker">
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => readBackup(event.target.files?.[0])}
              />
              <span>JSONファイルを選択</span>
            </label>
            {error && <p className="backup-error">{error}</p>}
            {preview && (
              <div className="restore-preview">
                <strong>復元する内容</strong>
                <div>
                  <span>{preview.posts.length}件の投稿</span>
                  <span>
                    {Object.keys(preview.app_profiles).length}件のコンテンツ情報
                  </span>
                  <span>{preview.media?.length ?? 0}件の素材</span>
                  <span>
                    {preview.growth_request_history?.length ?? 0}件の依頼履歴
                  </span>
                  <span>{preview.message_drafts?.length ?? 0}件の文案</span>
                </div>
                <small>
                  作成日：
                  {new Date(preview.exported_at).toLocaleString("ja-JP")}
                </small>
                {confirmAction === "restore" ? (
                  <div className="confirm-box">
                    <p>現在のデータを、このバックアップで置き換えます。</p>
                    <div>
                      <button onClick={() => setConfirmAction(null)}>
                        戻る
                      </button>
                      <button
                        className="danger-solid"
                        onClick={async () => {
                          const restoredMedia = await Promise.all(
                            (preview.media ?? []).map(
                              async ({ data, ...item }) => ({
                                ...item,
                                blob: await fetch(data).then((response) =>
                                  response.blob(),
                                ),
                              }),
                            ),
                          );
                          await onRestore(
                            preview.posts.map(withoutBusinessMetrics),
                            preview.app_profiles,
                            preview.custom_apps ?? [],
                            preview.app_overrides ?? {},
                            restoredMedia,
                            preview.growth_request_history ?? [],
                            preview.message_drafts ?? [],
                          );
                          setConfirmAction(null);
                          setDone("バックアップを復元しました。");
                        }}
                      >
                        復元を実行
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="settings-primary"
                    onClick={() => setConfirmAction("restore")}
                  >
                    この内容を復元する
                  </button>
                )}
              </div>
            )}
          </section>
          <section className="settings-card">
            <div className="settings-card-title">
              <span>⌂</span>
              <div>
                <h3>ホーム画面で使う</h3>
                <p>
                  ブラウザの共有メニューから「ホーム画面に追加」を選ぶと、アプリのように起動できます。
                </p>
              </div>
            </div>
            <p className="pwa-note">
              一度開いた画面は、通信が不安定なときも表示できます。
            </p>
          </section>
          <section className="settings-card danger-card">
            <div className="settings-card-title">
              <span>!</span>
              <div>
                <h3>データを初期化</h3>
                <p>端末に保存した投稿・コンテンツ・素材を初期状態へ戻します。</p>
              </div>
            </div>
            {confirmAction === "reset" ? (
              <div className="confirm-box">
                <p>この操作は元に戻せません。先にバックアップを推奨します。</p>
                <div>
                  <button onClick={() => setConfirmAction(null)}>
                    キャンセル
                  </button>
                  <button
                    className="danger-solid"
                    onClick={async () => {
                      await onReset();
                      setConfirmAction(null);
                      setDone("データを初期状態へ戻しました。");
                    }}
                  >
                    初期化する
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="danger-outline"
                onClick={() => setConfirmAction("reset")}
              >
                全データを初期化
              </button>
            )}
          </section>
          {done && <p className="settings-done">✓ {done}</p>}
        </div>
      </section>
    </div>
  );
}

function NavButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function AppFilter({
  selected,
  setSelected,
}: {
  selected: string;
  setSelected: (id: string) => void;
}) {
  return (
    <div className="app-filter">
      {apps.map((app) => (
        <button
          key={app.id}
          className={`app-chip ${selected === app.id ? "selected" : ""}`}
          style={
            selected === app.id
              ? {
                  borderColor: app.color,
                  background: app.soft,
                  color: app.color,
                }
              : {}
          }
          onClick={() => setSelected(app.id)}
        >
          <AppBadge appId={app.id} size="sm" />
          <span>{app.name}</span>
        </button>
      ))}
    </div>
  );
}

function localIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOf(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function CalendarView({
  posts,
  selectedApp,
  setSelectedApp,
  onPreview,
  onEdit,
  onCreate,
}: {
  posts: Post[];
  selectedApp: string;
  setSelectedApp: (id: string) => void;
  onPreview: (post: Post) => void;
  onEdit: (post: Post) => void;
  onCreate: () => void;
}) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const todayIso = localIso(new Date());
  const currentWeekIso = localIso(mondayOf(new Date()));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const weekEnd = days[6];
  const startIso = localIso(weekStart);
  const endIso = localIso(weekEnd);
  const weekPosts = posts.filter(
    (post) =>
      post.isoDate && post.isoDate >= startIso && post.isoDate <= endIso,
  );
  const postedCount = weekPosts.filter(
    (post) => post.status === "投稿済み",
  ).length;
  const waitingCount = weekPosts.filter(
    (post) => post.status === "投稿待ち",
  ).length;
  const progress = weekPosts.length
    ? Math.round((postedCount / weekPosts.length) * 100)
    : 0;
  const moveWeek = (amount: number) =>
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  const weekdayNames = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <>
      <section className="week-head">
        <button
          className="icon-button mini"
          aria-label="前の週"
          onClick={() => moveWeek(-1)}
        >
          <Icon name="chevronLeft" />
        </button>
        <div>
          <strong>
            {weekStart.getMonth() + 1}月{weekStart.getDate()}日〜
            {weekEnd.getMonth() + 1}月{weekEnd.getDate()}日
          </strong>
          {startIso === currentWeekIso ? (
            <span>今週</span>
          ) : (
            <button
              className="back-to-week"
              onClick={() => setWeekStart(mondayOf(new Date()))}
            >
              今週へ
            </button>
          )}
        </div>
        <button
          className="icon-button mini"
          aria-label="次の週"
          onClick={() => moveWeek(1)}
        >
          <Icon name="chevronRight" />
        </button>
      </section>
      <AppFilter selected={selectedApp} setSelected={setSelectedApp} />
      <section className="summary-grid">
        <article>
          <span>この週の予定</span>
          <strong>{weekPosts.length}</strong>
          <small>件</small>
        </article>
        <article>
          <span>投稿待ち</span>
          <strong>{waitingCount}</strong>
          <small>件</small>
        </article>
        <article>
          <span>投稿済み</span>
          <strong className="green">{postedCount}</strong>
          <small>件</small>
        </article>
      </section>
      <div className="progress-row">
        <span>この週の進捗</span>
        <div className="progress">
          <i style={{ width: `${progress}%` }} />
        </div>
        <strong>
          {postedCount}/{weekPosts.length}
        </strong>
      </div>
      {days.map((date) => {
        const iso = localIso(date);
        const dayPosts = weekPosts
          .filter((post) => post.isoDate === iso)
          .sort((a, b) => a.time.localeCompare(b.time));
        const isToday = iso === todayIso;
        return (
          <section
            className={`day-section ${isToday ? "" : "compact"}`}
            key={iso}
          >
            <div className="day-title">
              <div>
                {isToday && <span className="today-pill">今日</span>}
                <h2>
                  {date.getMonth() + 1}月{date.getDate()}日{" "}
                  <small>{weekdayNames[date.getDay()]}曜日</small>
                </h2>
              </div>
              <button
                className={isToday ? "day-add" : "round-add"}
                aria-label="投稿を追加"
                onClick={onCreate}
              >
                <Icon name="plus" size={18} />
                {isToday && "追加"}
              </button>
            </div>
            {dayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPreview={onPreview}
                onEdit={onEdit}
              />
            ))}
            {dayPosts.length === 0 && <EmptyDay onCreate={onCreate} />}
          </section>
        );
      })}
    </>
  );
}

function PostCard({
  post,
  onPreview,
  onEdit,
}: {
  post: Post;
  onPreview: (post: Post) => void;
  onEdit: (post: Post) => void;
}) {
  const app = apps.find((item) => item.id === post.app)!;
  const postText =
    post.text.length > 118 ? `${post.text.slice(0, 118)}...` : post.text;
  return (
    <article
      className="post-card"
      style={{ "--app-color": app.color } as React.CSSProperties}
    >
      <div className="post-meta">
        <div>
          <AppBadge appId={post.app} />
          <span>
            <strong>{app.name}</strong>
            <small>
              <Icon name="clock" size={14} />
              {post.time}
            </small>
          </span>
        </div>
        <Status value={post.status} />
      </div>
      <p className="post-copy">{postText}</p>
      <div className="tag-row">
        <span className="platform-label">{post.platform ?? "X"}</span>
        {Boolean(post.mediaIds?.length) && (
          <span className="attachment-label">▧ {post.mediaIds?.length}点</span>
        )}
        {post.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      {post.postedAt && (
        <p className="posted-time">
          投稿記録：{new Date(post.postedAt).toLocaleString("ja-JP")}
        </p>
      )}
      <div className="card-actions">
        <button className="secondary" onClick={() => onEdit(post)}>
          編集
        </button>
        <button className="x-button" onClick={() => onPreview(post)}>
          {post.status === "投稿済み"
            ? "投稿内容を確認"
            : `${post.platform ?? "X"}へ投稿`}
        </button>
      </div>
    </article>
  );
}

type PostDraftEventName =
  | "sns.post_draft.created.v1"
  | "sns.post_draft.updated.v1";

function buildPostDraftEvent(post: Post, eventName: PostDraftEventName) {
  const now = new Date().toISOString();
  const isUpdated = eventName === "sns.post_draft.updated.v1";
  return {
    id: `evt_${post.id}_${isUpdated ? "updated" : "created"}`,
    type: eventName,
    occurredAt: now,
    workspaceId: post.workspaceId || "wks_local",
    userId: post.userId || "user_local",
    ownerUserId: post.ownerUserId || "owner_user_local",
    source: "sns-planner",
    data: {
      draftId: `draft_${post.id}`,
      status: post.status,
      channel: post.platform ?? "X",
      subjectId: post.app,
      scheduledAt: post.isoDate ? `${post.isoDate}T${post.time}:00` : null,
      post: {
        title: post.text.split("\n").find(Boolean)?.slice(0, 48) || "投稿案",
        content: post.text,
        hashtags: post.tags,
        imagePrompt: post.imagePrompt || "",
        reelScript: post.reelScript || "",
        story: post.storyIdea || "",
      },
      changes: isUpdated
        ? {
            content: true,
            schedule: true,
            status: true,
            creativeAssets: Boolean(
              post.imagePrompt || post.reelScript || post.storyIdea,
            ),
          }
        : undefined,
    },
  };
}

function PostPublishModal({
  post,
  onClose,
  onOpenX,
  onMarkPosted,
}: {
  post: Post;
  onClose: () => void;
  onOpenX: (text: string) => void;
  onMarkPosted: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedEventName, setCopiedEventName] =
    useState<PostDraftEventName | null>(null);
  const fullText =
    `${post.text}\n\n${post.tags.map((tag) => `#${tag}`).join(" ")}`.trim();
  const createdEvent = JSON.stringify(
    buildPostDraftEvent(post, "sns.post_draft.created.v1"),
    null,
    2,
  );
  const updatedEvent = JSON.stringify(
    buildPostDraftEvent(post, "sns.post_draft.updated.v1"),
    null,
    2,
  );
  const copyText = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const copyEvent = async (eventName: PostDraftEventName, body: string) => {
    await navigator.clipboard.writeText(body);
    setCopiedEventName(eventName);
    window.setTimeout(() => setCopiedEventName(null), 1600);
  };
  return (
    <div className="modal-backdrop">
      <section
        className="publish-modal"
        role="dialog"
        aria-modal="true"
        aria-label="SNS投稿プレビュー"
      >
        <header>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            <Icon name="chevronLeft" />
          </button>
          <div>
            <p className="eyebrow">POST PREVIEW</p>
            <h2>{post.platform ?? "X"}へ投稿</h2>
          </div>
        </header>
        <div className="publish-body">
          <div className="publish-summary">
            <AppBadge appId={post.app} />
            <div>
              <strong>{apps.find((app) => app.id === post.app)?.name}</strong>
              <span>
                {post.date}・{post.time}
              </span>
            </div>
            <Status value={post.status} />
          </div>
          <section className="sns-preview">
            <div className="sns-preview-head">
              <strong>{post.platform ?? "X"} 投稿プレビュー</strong>
              <span>{fullText.length}文字</span>
            </div>
            <p>{post.text}</p>
            <div>
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </section>
          {(post.imagePrompt || post.reelScript || post.storyIdea) && (
            <section className="draft-output-card">
              <strong>投稿案の補足</strong>
              {post.imagePrompt && (
                <div>
                  <span>画像案</span>
                  <p>{post.imagePrompt}</p>
                </div>
              )}
              {post.reelScript && (
                <div>
                  <span>リール案</span>
                  <p>{post.reelScript}</p>
                </div>
              )}
              {post.storyIdea && (
                <div>
                  <span>ストーリー案</span>
                  <p>{post.storyIdea}</p>
                </div>
              )}
            </section>
          )}
          <details className="event-preview-card">
            <summary>外部連携用の情報</summary>
            <p>
              他のアプリへ投稿案を返す時だけ使う情報です。通常は開かなくて構いません。
            </p>
            <div className="event-json-block">
              <strong>作成イベント</strong>
              <pre>{createdEvent}</pre>
              <button
                type="button"
                onClick={() =>
                  copyEvent("sns.post_draft.created.v1", createdEvent)
                }
              >
                {copiedEventName === "sns.post_draft.created.v1"
                  ? "作成イベントをコピーしました"
                  : "作成イベントをコピー"}
              </button>
            </div>
            <div className="event-json-block">
              <strong>更新イベント</strong>
              <pre>{updatedEvent}</pre>
              <button
                type="button"
                onClick={() =>
                  copyEvent("sns.post_draft.updated.v1", updatedEvent)
                }
              >
                {copiedEventName === "sns.post_draft.updated.v1"
                  ? "更新イベントをコピーしました"
                  : "更新イベントをコピー"}
              </button>
            </div>
          </details>
          <div className="publish-note">
            {post.platform === "X"
              ? "Xの投稿画面を開きます。投稿後、この画面へ戻って記録してください。"
              : "本文をコピーして、SNSアプリへ貼り付けてください。投稿後に記録できます。"}
          </div>
          {post.postedAt && (
            <div className="already-posted">
              ✓ {new Date(post.postedAt).toLocaleString("ja-JP")}
              に投稿済みとして記録されています。
            </div>
          )}
        </div>
        <footer>
          <button className="secondary large" onClick={copyText}>
            {copied ? "コピーしました" : "本文をコピー"}
          </button>
          {post.platform === "X" && post.status !== "投稿済み" ? (
            <button
              className="x-button large"
              onClick={() => onOpenX(fullText)}
            >
              <Icon name="x" size={18} />
              Xを開く
            </button>
          ) : post.status !== "投稿済み" ? (
            <button className="import-button" onClick={onMarkPosted}>
              投稿済みにする
            </button>
          ) : (
            <button className="import-button" onClick={onClose}>
              閉じる
            </button>
          )}
        </footer>
        {post.platform === "X" && post.status !== "投稿済み" && (
          <button className="mark-posted-bottom" onClick={onMarkPosted}>
            投稿済みとして記録
          </button>
        )}
      </section>
    </div>
  );
}

function EmptyDay({ onCreate }: { onCreate: () => void }) {
  return (
    <button className="empty-day" onClick={onCreate}>
      <Icon name="plus" size={18} />
      <span>この日に投稿を追加</span>
    </button>
  );
}

function SearchModal({
  filters,
  resultCount,
  onClose,
  onApply,
}: {
  filters: PostFilters;
  resultCount: number;
  onClose: () => void;
  onApply: (filters: PostFilters) => void;
}) {
  const [draft, setDraft] = useState(filters);
  const field = (key: keyof PostFilters, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <div className="modal-backdrop">
      <section
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="投稿を検索・絞り込み"
      >
        <header>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            <Icon name="chevronLeft" />
          </button>
          <div>
            <p className="eyebrow">SEARCH</p>
            <h2>投稿を探す</h2>
          </div>
        </header>
        <div className="search-body">
          <label className="prompt-field">
            <span>キーワード</span>
            <input
              value={draft.query}
              onChange={(event) => field("query", event.target.value)}
              placeholder="本文・タグ・コンテンツ名"
              autoFocus
            />
          </label>
          <div className="form-fields">
            <label className="prompt-field">
              <span>投稿先SNS</span>
              <select
                value={draft.platform}
                onChange={(event) => field("platform", event.target.value)}
              >
                <option value="all">すべて</option>
                {platforms.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="prompt-field">
              <span>ステータス</span>
              <select
                value={draft.status}
                onChange={(event) => field("status", event.target.value)}
              >
                <option value="all">すべて</option>
                {["アイデア", "作成中", "投稿待ち", "投稿済み"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-fields">
            <label className="prompt-field">
              <span>開始日</span>
              <input
                type="date"
                value={draft.start}
                onChange={(event) => field("start", event.target.value)}
              />
            </label>
            <label className="prompt-field">
              <span>終了日</span>
              <input
                type="date"
                value={draft.end}
                onChange={(event) => field("end", event.target.value)}
              />
            </label>
          </div>
          <p className="search-hint">
            現在の条件では {resultCount}{" "}
            件です。適用すると投稿管理へ移動します。
          </p>
        </div>
        <footer>
          <button
            className="secondary large"
            onClick={() => setDraft(emptyFilters)}
          >
            条件をクリア
          </button>
          <button className="import-button" onClick={() => onApply(draft)}>
            この条件で表示
          </button>
        </footer>
      </section>
    </div>
  );
}

function PostsView({
  posts,
  selectedApp,
  setSelectedApp,
  view,
  setView,
  onPreview,
  onEdit,
  onBulkImport,
  onFilter,
  filters,
}: {
  posts: Post[];
  selectedApp: string;
  setSelectedApp: (id: string) => void;
  view: "list" | "board";
  setView: (v: "list" | "board") => void;
  onPreview: (post: Post) => void;
  onEdit: (post: Post) => void;
  onBulkImport: () => void;
  onFilter: () => void;
  filters: PostFilters;
}) {
  const columns = ["アイデア", "作成中", "投稿待ち"];
  const [eventsCopied, setEventsCopied] = useState(false);
  const activeCount = Object.entries(filters).filter(
    ([key, value]) => value && value !== "all" && !(key === "query" && !value),
  ).length;
  const copyVisibleEvents = async () => {
    const payload = {
      schemaVersion: "1.0",
      source: "sns-planner",
      eventType: "sns.post_draft.created.v1",
      count: posts.length,
      events: posts.map((post) =>
        buildPostDraftEvent(post, "sns.post_draft.created.v1"),
      ),
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setEventsCopied(true);
    window.setTimeout(() => setEventsCopied(false), 1600);
  };
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONTENT</p>
          <h2>投稿管理</h2>
        </div>
        <div className="heading-actions">
          <button className="ai-import-button" onClick={onBulkImport}>
            <span>AI</span>一括取込
          </button>
          <button
            className="event-copy-button"
            onClick={copyVisibleEvents}
            disabled={posts.length === 0}
          >
            {eventsCopied ? "コピー済み" : "イベントコピー"}
          </button>
          <button
            className={`filter-button ${activeCount ? "filter-active" : ""}`}
            aria-label="絞り込み"
            onClick={onFilter}
          >
            <Icon name="settings" size={18} />
            {activeCount > 0 && <i>{activeCount}</i>}
          </button>
        </div>
      </div>
      <AppFilter selected={selectedApp} setSelected={setSelectedApp} />
      <div className="segmented">
        <button
          className={view === "list" ? "active" : ""}
          onClick={() => setView("list")}
        >
          一覧
        </button>
        <button
          className={view === "board" ? "active" : ""}
          onClick={() => setView("board")}
        >
          カンバン
        </button>
      </div>
      {posts.length === 0 ? (
        <div className="empty-media">
          <Icon name="search" size={30} />
          <strong>条件に合う投稿がありません</strong>
          <p>検索条件を変えてお試しください。</p>
          <button className="primary-small" onClick={onFilter}>
            条件を変更
          </button>
        </div>
      ) : view === "list" ? (
        <div className="post-list">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPreview={onPreview}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="board">
          {columns.map((column) => (
            <section className="board-column" key={column}>
              <div>
                <Status value={column} />
                <strong>
                  {posts.filter((p) => p.status === column).length}
                </strong>
              </div>
              {posts
                .filter((p) => p.status === column)
                .map((post) => (
                  <article
                    className="mini-card"
                    key={post.id}
                    onClick={() => onPreview(post)}
                  >
                    <div>
                      <AppBadge appId={post.app} size="sm" />
                      <span>{post.time}</span>
                    </div>
                    <p>{post.text}</p>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(post);
                      }}
                    >
                      <Icon name="more" />
                    </button>
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function MediaView({
  selectedApp,
  setSelectedApp,
  assets,
  onUpload,
  onDelete,
}: {
  selectedApp: string;
  setSelectedApp: (id: string) => void;
  assets: MediaAsset[];
  onUpload: (file: File, appId: string) => Promise<void>;
  onDelete: (asset: MediaAsset) => Promise<void>;
}) {
  const [uploadApp, setUploadApp] = useState(
    selectedApp === "all" ? "numeria" : selectedApp,
  );
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const visible = assets.filter(
    (asset) => selectedApp === "all" || asset.appId === selectedApp,
  );
  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) await onUpload(file, uploadApp);
  };
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">LIBRARY</p>
          <h2>素材</h2>
        </div>
      </div>
      <section className="media-intro">
        <div>
          <strong>投稿に使う画像・動画を保存します</strong>
          <p>コンテンツごとに素材を分けておくと、投稿作成時に選びやすくなります。</p>
        </div>
        <span>{assets.length}点</span>
      </section>
      <AppFilter selected={selectedApp} setSelected={setSelectedApp} />
      <div className="upload-destination">
        <label>
          <span>追加先</span>
          <select
            value={uploadApp}
            onChange={(event) => setUploadApp(event.target.value)}
          >
            {apps.slice(1).map((app) => (
              <option value={app.id} key={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </label>
        <label className="primary-small media-upload inline-upload">
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(event) => uploadFiles(event.target.files)}
          />
          <Icon name="plus" size={18} />
          素材を追加
        </label>
      </div>
      <div className="folder-grid">
        {apps.slice(1).map((app) => (
          <article
            key={app.id}
            style={{ background: app.soft }}
            onClick={() => setSelectedApp(app.id)}
          >
            <AppBadge appId={app.id} size="lg" />
            <div>
              <strong>{app.name}</strong>
              <span>
                {assets.filter((asset) => asset.appId === app.id).length}点
              </span>
            </div>
            <Icon name="chevronRight" />
          </article>
        ))}
      </div>
      <div className="subheading">
        <h3>登録済み素材</h3>
        <span>{visible.length}点</span>
      </div>
      {visible.length ? (
        <div className="media-grid">
          {visible.map((asset) => (
            <button
              className="media-tile real-media"
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
            >
              {asset.mimeType.startsWith("video/") ? (
                <video src={asset.url} muted playsInline />
              ) : (
                <img src={asset.url} alt={asset.name} />
              )}
              <i>{asset.mimeType.startsWith("video/") ? "動画" : "画像"}</i>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-media">
          <Icon name="image" size={30} />
          <strong>素材はまだありません</strong>
          <p>画像や動画を追加すると、投稿作成画面で選べます。</p>
          <label className="primary-small media-upload empty-upload">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(event) => uploadFiles(event.target.files)}
            />
            <Icon name="plus" size={18} />
            素材を追加
          </label>
        </div>
      )}
      {selectedAsset && (
        <div className="modal-backdrop">
          <section className="asset-modal">
            <header>
              <button
                className="icon-button"
                onClick={() => setSelectedAsset(null)}
              >
                <Icon name="chevronLeft" />
              </button>
              <div>
                <p className="eyebrow">MEDIA DETAIL</p>
                <h2>素材を確認</h2>
              </div>
            </header>
            <div className="asset-preview">
              {selectedAsset.mimeType.startsWith("video/") ? (
                <video src={selectedAsset.url} controls playsInline />
              ) : (
                <img src={selectedAsset.url} alt={selectedAsset.name} />
              )}
              <div>
                <strong>{selectedAsset.name}</strong>
                <span>
                  {apps.find((app) => app.id === selectedAsset.appId)?.name}・
                  {(selectedAsset.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            </div>
            <footer>
              <button
                className="danger-outline"
                onClick={async () => {
                  await onDelete(selectedAsset);
                  setSelectedAsset(null);
                }}
              >
                削除
              </button>
              <button
                className="import-button"
                onClick={() => setSelectedAsset(null)}
              >
                閉じる
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function AppsView({
  onCreate,
  profiles,
  onSaveProfile,
  onAdd,
  onUpdateApp,
  onDelete,
}: {
  onCreate: () => void;
  profiles: Record<string, PromptAppInfo>;
  onSaveProfile: (appId: string, profile: PromptAppInfo) => void;
  onAdd: (app: AppDefinition, profile: PromptAppInfo) => void;
  onUpdateApp: (appId: string, app: Partial<AppDefinition>) => void;
  onDelete: (id: string) => void;
}) {
  const [editingApp, setEditingApp] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<AppDefinition | null>(null);
  const contentApps = apps.slice(1);
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">CONTENT SUBJECTS</p>
          <h2>コンテンツ</h2>
        </div>
        <button className="primary-small" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} />
          追加
        </button>
      </div>
      <section className="content-intro">
        <div>
          <strong>投稿で紹介する内容を登録します</strong>
          <p>名前、リンク先、概要、タグ候補を保存しておくと、投稿作成でそのまま使えます。</p>
        </div>
        <span>{contentApps.length}件</span>
      </section>
      <p className="lead">まず紹介したい内容を追加し、必要な時に「投稿を作る」へ進みます。</p>
      <div className="apps-list">
        {contentApps.map((app, index) => (
          <article
            className="project-card"
            key={app.id}
            style={{ "--app-color": app.color } as React.CSSProperties}
          >
            <div className="project-top">
              <AppBadge appId={app.id} size="lg" />
              <div>
                <h3>{app.name}</h3>
                <p>{profiles[app.id]?.summary}</p>
                {profiles[app.id]?.url && (
                  <small className="project-url">{profiles[app.id].url}</small>
                )}
              </div>
            </div>
            <div className="project-hints" aria-label={`${app.name}で登録できる情報`}>
              <span>名前</span>
              <span>リンク先</span>
              <span>概要</span>
              <span>タグ候補</span>
            </div>
            <div className="project-stats">
              <span>
                <strong>{index === 0 ? 3 : 2}</strong>今週の予定
              </span>
              <span>
                <strong>{index === 0 ? 2 : 1}</strong>投稿待ち
              </span>
              <span>
                <strong>{index === 0 ? 12 : 8}</strong>素材
              </span>
            </div>
            <div className="project-actions">
              <button className="filled" onClick={() => setEditingApp(app.id)}>
                情報を編集
              </button>
              <button className="filled" onClick={onCreate}>
                投稿を作る
              </button>
            </div>
          </article>
        ))}
      </div>
      {editingApp && (
        <AppProfileEditor
          appId={editingApp}
          app={apps.find((item) => item.id === editingApp)}
          profile={profiles[editingApp]}
          onClose={() => setEditingApp(null)}
          onSave={(nextApp, profile) => {
            onUpdateApp(editingApp, nextApp);
            onSaveProfile(editingApp, profile);
            setEditingApp(null);
          }}
          onDelete={(app) => setDeleting(app)}
        />
      )}
      {adding && (
        <AddAppModal
          onClose={() => setAdding(false)}
          onSave={(app, profile) => {
            onAdd(app, profile);
            setAdding(false);
          }}
        />
      )}
      {deleting && (
        <div className="modal-backdrop">
          <section className="confirm-modal">
            <h2>コンテンツを削除しますか？</h2>
            <p>
              「{deleting.name}」と、このコンテンツの投稿も削除されます。先にバックアップをおすすめします。
            </p>
            <div>
              <button className="secondary" onClick={() => setDeleting(null)}>
                キャンセル
              </button>
              <button
                className="danger-solid"
                onClick={() => {
                  onDelete(deleting.id);
                  setDeleting(null);
                  setEditingApp(null);
                }}
              >
                削除する
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function AddAppModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (app: AppDefinition, profile: PromptAppInfo) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [target, setTarget] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState("");
  const save = () => {
    const id = `app-${Date.now()}`;
    const colors = [
      { color: "#2777d8", soft: "#eaf3ff" },
      { color: "#d05c32", soft: "#fff0e9" },
      { color: "#7d53b8", soft: "#f3edff" },
    ];
    const palette = colors[apps.length % colors.length];
    onSave(
      {
        id,
        name: name.trim(),
        short: name.trim().slice(0, 2),
        tagSuggestions: tagSuggestions
          .split(/[\s,#]+/)
          .map((tag) => tag.trim().replace(/^#/, ""))
          .filter(Boolean),
        ...palette,
      },
      {
        url: url.trim(),
        summary: summary.trim(),
        target: target.trim(),
        problem: "",
        features: "",
        strength: "",
        cta: "詳細を見る",
      },
    );
  };
  return (
    <div className="modal-backdrop">
      <section
        className="profile-editor content-add-editor"
        role="dialog"
        aria-modal="true"
        aria-label="コンテンツを追加"
      >
        <header>
          <button
            className="icon-button"
            onPointerDown={blurActiveElement}
            onClick={onClose}
          >
            <Icon name="chevronLeft" />
          </button>
          <div>
            <p className="eyebrow">NEW CONTENT</p>
            <h2>コンテンツを追加</h2>
          </div>
          <button
            className="save-link"
            disabled={!name.trim()}
            onPointerDown={blurActiveElement}
            onClick={save}
          >
            追加
          </button>
        </header>
        <div className="profile-editor-body content-editor-body">
          <p className="profile-help">
            登録した情報は投稿作成プロンプトへ自動で渡されます。
          </p>
          <label className="prompt-field required-field">
            <span>コンテンツ名（必須）</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例：無料恋愛相談、鑑定メニュー、記事タイトル"
            />
          </label>
          <label className="prompt-field">
            <span>導線先URL</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
            />
          </label>
          <label className="prompt-field">
            <span>コンテンツ概要</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="何を紹介する投稿対象か"
            />
          </label>
          <label className="prompt-field">
            <span>想定読者・対象者</span>
            <textarea
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="誰に届ける内容か"
            />
          </label>
          <label className="prompt-field">
            <span>投稿作成で出すタグ候補</span>
            <input
              value={tagSuggestions}
              onChange={(event) => setTagSuggestions(event.target.value)}
              placeholder="無料相談 占い LINE登録"
            />
          </label>
        </div>
        <footer>
          <button
            className="secondary large"
            onPointerDown={blurActiveElement}
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="import-button"
            disabled={!name.trim()}
            onPointerDown={blurActiveElement}
            onClick={save}
          >
            追加する
          </button>
        </footer>
      </section>
    </div>
  );
}

function AppProfileEditor({
  appId,
  app,
  profile,
  onClose,
  onSave,
  onDelete,
}: {
  appId: string;
  app?: AppDefinition;
  profile: PromptAppInfo;
  onClose: () => void;
  onSave: (app: Partial<AppDefinition>, profile: PromptAppInfo) => void;
  onDelete: (app: AppDefinition) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [name, setName] = useState(app?.name ?? "");
  const [short, setShort] = useState(app?.short ?? "");
  const [tagSuggestions, setTagSuggestions] = useState(
    app?.tagSuggestions?.join(" ") ?? "",
  );
  const field = (key: keyof PromptAppInfo, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const parsedSuggestions = tagSuggestions
    .split(/[\s,#]+/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
  const save = () =>
    onSave(
      {
        name: name.trim(),
        short: short.trim().slice(0, 3) || name.trim().slice(0, 2),
        tagSuggestions: parsedSuggestions,
      },
      draft,
    );
  return (
    <div className="modal-backdrop">
      <section
        className="profile-editor"
        role="dialog"
        aria-modal="true"
        aria-label="コンテンツ情報を編集"
      >
        <header>
          <button
            className="icon-button"
            onPointerDown={blurActiveElement}
            onClick={onClose}
            aria-label="閉じる"
          >
            <Icon name="chevronLeft" />
          </button>
          <div>
            <p className="eyebrow">CONTENT PROFILE</p>
            <h2>{name || app?.name}</h2>
          </div>
          <button
            className="save-link"
            disabled={!name.trim()}
            onPointerDown={blurActiveElement}
            onClick={save}
          >
            保存
          </button>
        </header>
        <div className="profile-editor-body">
          <p className="profile-help">
            ここで保存した投稿対象情報が、投稿作成プロンプトへ自動で入ります。
          </p>
          <div className="form-fields">
            <label className="prompt-field required-field">
              <span>コンテンツ名（必須）</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="prompt-field">
              <span>略称</span>
              <input
                value={short}
                maxLength={3}
                onChange={(event) => setShort(event.target.value)}
                placeholder="Nu"
              />
            </label>
          </div>
          <label className="prompt-field">
            <span>導線先URL</span>
            <input
              type="url"
              value={draft.url}
              onChange={(event) => field("url", event.target.value)}
              placeholder="https://example.com"
            />
          </label>
          <label className="prompt-field">
            <span>コンテンツ概要</span>
            <textarea
              value={draft.summary}
              onChange={(event) => field("summary", event.target.value)}
            />
          </label>
          <label className="prompt-field">
            <span>想定読者・対象者</span>
            <textarea
              value={draft.target}
              onChange={(event) => field("target", event.target.value)}
            />
          </label>
          <label className="prompt-field">
            <span>扱う課題</span>
            <textarea
              value={draft.problem}
              onChange={(event) => field("problem", event.target.value)}
            />
          </label>
          <label className="prompt-field">
            <span>主な内容・提供価値</span>
            <textarea
              value={draft.features}
              onChange={(event) => field("features", event.target.value)}
            />
          </label>
          <label className="prompt-field">
            <span>見せ方・特徴</span>
            <textarea
              value={draft.strength}
              onChange={(event) => field("strength", event.target.value)}
            />
          </label>
          <label className="prompt-field">
            <span>促したい行動</span>
            <input
              value={draft.cta}
              onChange={(event) => field("cta", event.target.value)}
            />
          </label>
          <label className="prompt-field">
            <span>投稿作成で出すタグ候補</span>
            <input
              value={tagSuggestions}
              onChange={(event) => setTagSuggestions(event.target.value)}
              placeholder="無料相談 占い LINE登録"
            />
          </label>
          {parsedSuggestions.length > 0 && (
            <div className="suggestion-preview">
              {parsedSuggestions.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
          {app && (
            <button
              className="danger-outline app-editor-delete"
              onPointerDown={blurActiveElement}
              onClick={() => onDelete(app)}
            >
              このコンテンツを削除
            </button>
          )}
        </div>
        <footer>
          <button
            className="secondary large"
            onPointerDown={blurActiveElement}
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="import-button"
            disabled={!name.trim()}
            onPointerDown={blurActiveElement}
            onClick={save}
          >
            保存する
          </button>
        </footer>
      </section>
    </div>
  );
}

type ComposerData = Omit<Post, "id">;

type MetadataState = {
  post: Record<string, unknown> | null;
  message: Record<string, unknown> | null;
  error: string;
};

type ApiCheckItem = {
  label: string;
  endpoint: string;
  status: "checking" | "ok" | "error";
  detail: string;
};

const apiCheckEndpoints = [
  { label: "起動確認", endpoint: "/health" },
  { label: "バージョン", endpoint: "/version" },
  { label: "ルール確認", endpoint: "/contracts/status" },
  { label: "投稿作成", endpoint: "/api/post-drafts/metadata" },
  { label: "連携文案API", endpoint: "/api/message-drafts/metadata" },
];

function blurActiveElement() {
  if (
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement ||
    document.activeElement instanceof HTMLSelectElement
  ) {
    document.activeElement.blur();
  }
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function filterAllowedBrief(raw: string) {
  const parsed = safeJsonParse(raw);
  if (!parsed) return null;
  const allowedKeys = [
    "workspaceId",
    "workspace_id",
    "userId",
    "user_id",
    "sourceApp",
    "targetStudio",
    "channel",
    "purpose",
    "objective",
    "audienceSegment",
    "targetAudience",
    "tone",
    "cta",
    "inputRef",
    "draftId",
    "messageDraftId",
    "eventName",
    "traceId",
    "correlationId",
    "requestId",
  ];
  return Object.fromEntries(
    allowedKeys
      .filter((key) => parsed[key] !== undefined)
      .map((key) => [key, parsed[key]]),
  );
}

function briefValue(
  brief: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = brief[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function briefLabel(value: string, fallback: string) {
  const labels: Record<string, string> = {
    instagram: "Instagram",
    instagram_post: "Instagram投稿",
    instagram_dm: "Instagram DM",
    x: "X",
    threads: "Threads",
    line: "LINE",
    email: "メール",
    sms: "SMS",
    other: "その他",
    increase_reservations: "予約を増やす",
    line_registration: "LINE登録",
    reservation_reminder: "予約の確認",
    followup: "フォロー連絡",
    repeat_visit: "再来店の案内",
    campaign_notice: "キャンペーン案内",
    thank_you: "お礼",
    inactive_customer: "久しぶりの方向け",
    new_lead: "初めての方向け",
    first_time_customer: "初回利用者向け",
    repeat_customer: "リピート利用者向け",
    high_value_customer: "大切な利用者向け",
    polite: "丁寧",
    friendly: "親しみやすい",
    concise: "短め",
    warm: "やさしい",
    professional: "きちんと",
    casual: "カジュアル",
    premium: "上質",
    gentle: "やわらかい",
    numeria: "鑑定・相談向け",
    velvet: "来店案内向け",
  };
  return labels[value] ?? (value || fallback);
}

function briefInputRef(brief: Record<string, unknown>) {
  const inputRef = brief.inputRef;
  if (!inputRef || typeof inputRef !== "object" || Array.isArray(inputRef))
    return [];
  return Object.entries(inputRef as Record<string, unknown>).filter(
    ([, value]) => typeof value === "string" && value.trim(),
  ) as Array<[string, string]>;
}

function PlannerHome({
  posts,
  requestHistory,
  onCreatePost,
  onOpenDrafts,
  onOpenBriefs,
  onOpenMetadata,
  onOpenMedia,
  onOpenApps,
  onOpenSettings,
  onBulkImport,
}: {
  posts: Post[];
  requestHistory: GrowthRequestHistory[];
  onCreatePost: () => void;
  onOpenDrafts: () => void;
  onOpenBriefs: () => void;
  onOpenMetadata: () => void;
  onOpenMedia: () => void;
  onOpenApps: () => void;
  onOpenSettings: () => void;
  onBulkImport: () => void;
}) {
  const recentPosts = posts.slice(0, 2);
  const totalDrafts = posts.length;

  return (
    <section className="planner-home">
      <div className="home-info-card">
        <p className="eyebrow">このアプリでできること</p>
        <h2>SNS投稿を作る</h2>
        <p>
          Instagram、X、Threadsなどに載せる文章を作ります。保存した文章は下書きからコピーできます。
        </p>
      </div>
      <div className="home-choice-grid" aria-label="主要操作">
        <button className="home-choice primary" onClick={onCreatePost}>
          <span className="choice-kicker">SNS向け</span>
          <strong>投稿を作る</strong>
          <span>Instagram、X、Threads などの投稿文を作ります。</span>
        </button>
        <button className="home-choice" onClick={onOpenDrafts}>
          <span className="choice-kicker">保存済み</span>
          <strong>下書きを見る</strong>
          <span>作った文章を確認してコピーします。</span>
        </button>
      </div>
      <section className="home-step-guide" aria-label="初めて使う時の順番">
        <strong>初めて使う時の順番</strong>
        <div>
          <span><b>1</b>紹介する内容を登録</span>
          <span><b>2</b>投稿を作る</span>
          <span><b>3</b>文章を保存</span>
          <span><b>4</b>コピーして使う</span>
        </div>
      </section>
      <section className="home-final-check" aria-label="使い始めチェック">
        <div>
          <strong>迷ったらここから</strong>
          <span>上から順番に確認</span>
        </div>
        <button type="button" onClick={onOpenApps}>
          1. 内容を登録
        </button>
        <button type="button" onClick={onCreatePost}>
          2. 投稿を作る
        </button>
        <button type="button" onClick={onOpenDrafts}>
          3. 下書きを見る
        </button>
      </section>
      <div className="home-status-grid" aria-label="保存済み">
        <button type="button" onClick={onOpenDrafts}>
          <span>下書き</span>
          <strong>{totalDrafts}</strong>
          <small>作った文章を見る</small>
        </button>
        <button type="button" onClick={onOpenMedia}>
          <span>素材</span>
          <strong>画像</strong>
          <small>画像・動画を管理</small>
        </button>
        <button type="button" onClick={onOpenApps}>
          <span>内容</span>
          <strong>設定</strong>
          <small>紹介する内容を登録</small>
        </button>
      </div>
      <details className="home-more-tools">
        <summary>設定・確認</summary>
        <div className="home-sub-actions">
          <button onClick={onBulkImport}>投稿をまとめて登録</button>
          <button onClick={onOpenBriefs}>外部から受け取った内容を見る</button>
          <button onClick={onOpenSettings}>バックアップ・完成チェック</button>
          <button onClick={onOpenMetadata}>対応形式を確認</button>
        </div>
      </details>
      <section className="home-section">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">最近</p>
            <h3>最近作成した文案</h3>
          </div>
          <span className="section-count">{totalDrafts}件</span>
        </div>
        {recentPosts.length === 0 ? (
          <div className="empty-state">
            <strong>まだ下書きがありません</strong>
            <p>最初は「投稿を作る」から始めてください。</p>
            <div className="empty-state-actions">
              <button type="button" onClick={onCreatePost}>
                投稿を作る
              </button>
            </div>
          </div>
        ) : (
          <div className="recent-draft-board">
            <div className="recent-draft-column">
              <div className="recent-draft-head">
                <strong>投稿</strong>
                <span>{posts.length}件</span>
              </div>
              {recentPosts.length === 0 ? (
                <p className="recent-empty">投稿の下書きはまだありません。</p>
              ) : (
                <div className="compact-draft-list">
                  {recentPosts.map((post) => (
                    <article key={`post-${post.id}`}>
                      <span>{post.platform ?? "SNS"}</span>
                      <strong>{post.status}</strong>
                      <p>{post.text}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <button className="recent-open-all" onClick={onOpenDrafts}>
              すべての下書きを見る
            </button>
          </div>
        )}
      </section>
      <details className="home-more-tools quiet">
        <summary>保存しない情報</summary>
        <p>
          売上、支払い、詳しい顧客情報、会話履歴は保存しません。
          このアプリではSNS投稿文だけを作ります。個別のやり取りは別アプリで扱います。
        </p>
      </details>
      {requestHistory.length > 0 && (
        <button className="full-width-link" onClick={onOpenBriefs}>
          最新の依頼メモを確認
        </button>
      )}
    </section>
  );
}

function DraftsView({
  posts,
  messageDrafts,
  onCreatePost,
  onEditPost,
  onDeletePost,
  onDeleteMessage,
}: {
  posts: Post[];
  messageDrafts: MessageDraft[];
  onCreatePost: () => void;
  onEditPost: (post: Post) => void;
  onDeletePost: (id: number) => void;
  onDeleteMessage: (id: number) => void;
}) {
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [draftQuery, setDraftQuery] = useState("");
  const [draftStatus, setDraftStatus] = useState("all");
  const [draftChannel, setDraftChannel] = useState("all");
  const hasAnyDraft = posts.length > 0;
  const copyDraftText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedDraftId(id);
    window.setTimeout(() => setCopiedDraftId(null), 1600);
  };
  const postChannels = Array.from(
    new Set(posts.map((post) => post.platform ?? "X")),
  );
  const filteredPosts = posts.filter((post) => {
    const query = draftQuery.trim().toLowerCase();
    const haystack = `${post.text} ${post.tags.join(" ")} ${post.platform ?? "X"} ${post.status}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (draftStatus !== "all" && post.status !== draftStatus) return false;
    if (draftChannel !== "all" && (post.platform ?? "X") !== draftChannel)
      return false;
    return true;
  });
  const resetDraftFilters = () => {
    setDraftQuery("");
    setDraftStatus("all");
    setDraftChannel("all");
  };
  const requestDelete = (id: string) => {
    if (deleteTargetId === id) {
      if (id.startsWith("post-")) onDeletePost(Number(id.replace("post-", "")));
      if (id.startsWith("message-"))
        onDeleteMessage(Number(id.replace("message-", "")));
      setDeleteTargetId(null);
      return;
    }
    setDeleteTargetId(id);
    window.setTimeout(() => {
      setDeleteTargetId((current) => (current === id ? null : current));
    }, 2600);
  };
  return (
    <section className="drafts-view">
      <div className="section-header">
        <div>
          <p className="eyebrow">DRAFTS</p>
          <h2>投稿下書き</h2>
        </div>
      </div>
      <div className="draft-overview" aria-label="下書きの件数">
        <button type="button" className="selected">
          <span>投稿</span>
          <strong>{posts.length}</strong>
          <small>SNS用の文章</small>
        </button>
      </div>
      <section className="draft-intro">
        <div>
          <strong>SNSに載せる文章を管理します</strong>
          <p>本文、ハッシュタグ、画像案、リール案、ストーリー案を確認できます。</p>
        </div>
        <span>使う時は本文をコピーします</span>
      </section>
      <div className="draft-create-row">
        <button type="button" className="primary-action" onClick={onCreatePost}>
          投稿を作る
        </button>
      </div>
      <p className="draft-helper">SNSに載せる投稿文の下書きです。コピーして各SNSで使えます。</p>
      {hasAnyDraft && (
        <div className="draft-filter-panel">
          <div className="draft-filter-summary">
            <strong>投稿を絞り込み</strong>
            <span>{filteredPosts.length}件表示中</span>
          </div>
          <label>
            <span>キーワード</span>
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="本文、タグ、送り先で検索"
            />
          </label>
          <div className="draft-filter-row">
            <select
              value={draftChannel}
              onChange={(event) => setDraftChannel(event.target.value)}
              aria-label="送り先で絞り込み"
            >
              <option value="all">すべての送り先</option>
              {postChannels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
            <select
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value)}
              aria-label="状態で絞り込み"
            >
              <option value="all">すべての状態</option>
              <option value="アイデア">アイデア</option>
              <option value="作成中">作成中</option>
              <option value="投稿待ち">投稿待ち</option>
              <option value="投稿済み">投稿済み</option>
            </select>
          </div>
          {(draftQuery || draftChannel !== "all" || draftStatus !== "all") && (
            <button type="button" onClick={resetDraftFilters}>
              条件をクリア
            </button>
          )}
        </div>
      )}
      <div className="draft-group">
        <h3>投稿 {filteredPosts.length}件</h3>
        {posts.length === 0 ? (
          <div className="empty-state">
            <strong>投稿下書きはありません</strong>
            <p>SNSに載せる文章を作ると、ここに保存されます。</p>
            <button type="button" onClick={onCreatePost}>
              投稿を作る
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">
            <strong>条件に合う投稿はありません</strong>
            <p>検索条件を変えるか、条件をクリアしてください。</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article
              key={post.id}
              className={`draft-list-item ${
                copiedDraftId === `post-${post.id}` ? "copied" : ""
              }`}
            >
              <div className="draft-card-top">
                <span className="draft-type">投稿</span>
                {copiedDraftId === `post-${post.id}` && (
                  <span className="copied-badge">コピー済み</span>
                )}
              </div>
              <strong>{post.platform ?? "SNS"} / {post.status}</strong>
              <p>{post.text}</p>
              <div className="draft-actions">
                <button
                  className="primary-action"
                  type="button"
                  onClick={() =>
                    copyDraftText(
                      `post-${post.id}`,
                      `${post.text}\n\n${post.tags.map((tag) => `#${tag}`).join(" ")}`.trim(),
                    )
                  }
                >
                  {copiedDraftId === `post-${post.id}`
                    ? "コピーしました"
                    : "本文をコピー"}
                </button>
                <button type="button" onClick={() => onEditPost(post)}>
                  編集
                </button>
                <button
                  type="button"
                  className="danger-action"
                  onClick={() => requestDelete(`post-${post.id}`)}
                >
                  {deleteTargetId === `post-${post.id}` ? "もう一度で削除" : "削除"}
                </button>
              </div>
              <dl>
                <div><dt>投稿先</dt><dd>{post.platform ?? "X"}</dd></div>
                <div><dt>状態</dt><dd>{post.status}</dd></div>
                <div><dt>日付</dt><dd>{post.isoDate ?? post.date}</dd></div>
              </dl>
              {(post.imagePrompt || post.reelScript || post.storyIdea) && (
                <details className="draft-variants">
                  <summary>投稿アイデアを見る</summary>
                  <div className="draft-variant-list">
                    {post.imagePrompt && (
                      <article>
                        <strong>画像案</strong>
                        <p>{post.imagePrompt}</p>
                        <button
                          type="button"
                          onClick={() =>
                            copyDraftText(
                              `post-${post.id}-image`,
                              post.imagePrompt ?? "",
                            )
                          }
                        >
                          {copiedDraftId === `post-${post.id}-image`
                            ? "コピーしました"
                            : "画像案をコピー"}
                        </button>
                      </article>
                    )}
                    {post.reelScript && (
                      <article>
                        <strong>リール案</strong>
                        <p>{post.reelScript}</p>
                        <button
                          type="button"
                          onClick={() =>
                            copyDraftText(
                              `post-${post.id}-reel`,
                              post.reelScript ?? "",
                            )
                          }
                        >
                          {copiedDraftId === `post-${post.id}-reel`
                            ? "コピーしました"
                            : "リール案をコピー"}
                        </button>
                      </article>
                    )}
                    {post.storyIdea && (
                      <article>
                        <strong>ストーリー案</strong>
                        <p>{post.storyIdea}</p>
                        <button
                          type="button"
                          onClick={() =>
                            copyDraftText(
                              `post-${post.id}-story`,
                              post.storyIdea ?? "",
                            )
                          }
                        >
                          {copiedDraftId === `post-${post.id}-story`
                            ? "コピーしました"
                            : "ストーリー案をコピー"}
                        </button>
                      </article>
                    )}
                  </div>
                </details>
              )}
            </article>
          ))
        )}
      </div>
      {messageDrafts.length > 0 && (
        <details className="home-more-tools quiet">
          <summary>連携で作成された文案 {messageDrafts.length}件</summary>
          <p>個別のやり取りはCommunication Plannerで扱います。ここでは他アプリ連携で残った文案だけ確認できます。</p>
          <div className="draft-group">
            {messageDrafts.map((draft) => (
              <article key={draft.id} className="draft-list-item">
                <div className="draft-card-top">
                  <span className="draft-type">連携文案</span>
                </div>
                <strong>{draft.channel} / 保存済み</strong>
                <p>{draft.generatedText}</p>
                <div className="draft-actions">
                  <button
                    className="primary-action"
                    type="button"
                    onClick={() =>
                      copyDraftText(`message-${draft.id}`, draft.generatedText)
                    }
                  >
                    {copiedDraftId === `message-${draft.id}`
                      ? "コピーしました"
                      : "本文をコピー"}
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => requestDelete(`message-${draft.id}`)}
                  >
                    {deleteTargetId === `message-${draft.id}`
                      ? "もう一度で削除"
                      : "削除"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function GrowthBriefsView({
  requestHistory,
  onBulkImport,
}: {
  requestHistory: GrowthRequestHistory[];
  onBulkImport: () => void;
}) {
  const validBriefCount = requestHistory.filter((item) =>
    Boolean(filterAllowedBrief(item.raw)),
  ).length;
  return (
    <section className="briefs-view">
      <div className="section-header">
        <div>
          <p className="eyebrow">REQUESTS</p>
          <h2>依頼メモ</h2>
        </div>
      </div>
      <p className="message-boundary-note">
        他の画面から受け取った「何を作るか」のメモです。顧客の詳しい情報、支払い、売上、専門記録の本文は扱いません。
      </p>
      <div className="brief-summary-grid" aria-label="依頼メモの件数">
        <div>
          <span>保存済み</span>
          <strong>{requestHistory.length}</strong>
          <small>依頼メモ</small>
        </div>
        <div>
          <span>表示可能</span>
          <strong>{validBriefCount}</strong>
          <small>安全に読めるメモ</small>
        </div>
      </div>
      {requestHistory.length === 0 ? (
        <div className="empty-state">
          <strong>依頼メモはありません</strong>
          <p>依頼メモをまとめて登録すると、ここで確認できます。</p>
          <button type="button" onClick={onBulkImport}>
            依頼メモを登録
          </button>
        </div>
      ) : (
        <div className="brief-list">
          {requestHistory.map((item) => {
            const safeBrief = filterAllowedBrief(item.raw);
            const inputRefs = safeBrief ? briefInputRef(safeBrief) : [];
            const channel = safeBrief ? briefValue(safeBrief, "channel") : "";
            const purpose = safeBrief
              ? briefValue(safeBrief, "purpose", "objective")
              : "";
            const audience = safeBrief
              ? briefValue(safeBrief, "audienceSegment", "targetAudience")
              : "";
            const tone = safeBrief ? briefValue(safeBrief, "tone") : "";
            const targetStudio = safeBrief
              ? briefValue(safeBrief, "targetStudio")
              : "";
            const cta = safeBrief ? briefValue(safeBrief, "cta") : "";
            return (
              <article key={item.id} className="brief-item">
                <strong>{item.title}</strong>
                <small>{new Date(item.savedAt).toLocaleString("ja-JP")}</small>
                {safeBrief ? (
                  <>
                    <dl className="brief-readable-grid">
                      <div>
                        <dt>作るもの</dt>
                        <dd>{briefLabel(channel, "未指定")}</dd>
                      </div>
                      <div>
                        <dt>目的</dt>
                        <dd>{briefLabel(purpose, "未指定")}</dd>
                      </div>
                      <div>
                        <dt>届ける相手</dt>
                        <dd>{briefLabel(audience, "未指定")}</dd>
                      </div>
                      <div>
                        <dt>雰囲気</dt>
                        <dd>{briefLabel(tone, "未指定")}</dd>
                      </div>
                      <div>
                        <dt>用途</dt>
                        <dd>{briefLabel(targetStudio, "未指定")}</dd>
                      </div>
                      <div>
                        <dt>案内文</dt>
                        <dd>{briefLabel(cta, "未指定")}</dd>
                      </div>
                    </dl>
                    {inputRefs.length > 0 && (
                      <div className="brief-ref-list">
                        <strong>関連ID</strong>
                        <div>
                          {inputRefs.map(([key, value]) => (
                            <span key={key}>
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <details className="identity-details">
                      <summary>連携用JSON</summary>
                      <pre>{JSON.stringify(safeBrief, null, 2)}</pre>
                    </details>
                  </>
                ) : (
                  <p>JSONとして読めない依頼です。保存内容は表示しません。</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MetadataView() {
  const [metadata, setMetadata] = useState<MetadataState>({
    post: null,
    message: null,
    error: "",
  });
  const [apiChecks, setApiChecks] = useState<ApiCheckItem[]>([]);
  const [apiCheckedAt, setApiCheckedAt] = useState("");
  const [isCheckingApis, setIsCheckingApis] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setApiChecks(
      apiCheckEndpoints.map((item) => ({
        ...item,
        status: "checking",
        detail: "確認中",
      })),
    );
    Promise.all([
      fetch("/api/post-drafts/metadata").then((response) => response.json()),
      fetch("/api/message-drafts/metadata").then((response) => response.json()),
    ])
      .then(([post, message]) => {
        if (!cancelled) setMetadata({ post, message, error: "" });
      })
      .catch(() => {
        if (!cancelled)
          setMetadata({
            post: null,
            message: null,
            error: "連携情報を取得できませんでした。",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runApiChecks = useCallback(async () => {
    setIsCheckingApis(true);
    setApiChecks(
      apiCheckEndpoints.map((item) => ({
        ...item,
        status: "checking",
        detail: "確認中",
      })),
    );
    const results = await Promise.all(
      apiCheckEndpoints.map(async (item) => {
        try {
          const response = await fetch(item.endpoint);
          const data = (await response.json()) as Record<string, unknown>;
          return {
            ...item,
            status: response.ok ? "ok" : "error",
            detail: String(data.status ?? response.status),
          } satisfies ApiCheckItem;
        } catch {
          return {
            ...item,
            status: "error",
            detail: "取得失敗",
          } satisfies ApiCheckItem;
        }
      }),
    );
    setApiChecks(results);
    setApiCheckedAt(new Date().toISOString());
    setIsCheckingApis(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    runApiChecks().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [runApiChecks]);

  const operationLabel = (title: string, data: Record<string, unknown>) => {
    const operation = String(data.operation ?? "");
    if (title.includes("投稿")) return "SNS投稿の下書きを作れます";
    if (title.includes("連携")) return "外部連携用の文案APIです";
    return operation || "-";
  };

  const renderMetadata = (title: string, data: Record<string, unknown> | null) => (
    <article className="metadata-card">
      <h3>{title}</h3>
      {!data ? (
        <p>読み込み中です。</p>
      ) : (
        <>
          <dl>
            <div><dt>できること</dt><dd>{operationLabel(title, data)}</dd></div>
            <div><dt>バージョン</dt><dd>{String(data.contractVersion ?? "-")}</dd></div>
            <div><dt>状態</dt><dd>{String(data.status ?? "-")}</dd></div>
            <div><dt>保存時の記録名</dt><dd>{String(data.eventName ?? (Array.isArray(data.events) ? data.events[0] : "-"))}</dd></div>
          </dl>
          <details className="identity-details">
            <summary>詳しい情報</summary>
            <pre>{JSON.stringify({
              supportedChannels: data.supportedChannels,
              requiredFields: data.requiredFields,
              prohibitedPayloadFields: data.prohibitedPayloadFields,
              messageDraftScope: data.messageDraftScope,
              communicationPlannerBoundary: data.communicationPlannerBoundary,
            }, null, 2)}</pre>
          </details>
        </>
      )}
    </article>
  );

  return (
    <section className="metadata-view">
      <div className="section-header">
        <div>
          <p className="eyebrow">確認</p>
          <h2>対応している形式</h2>
        </div>
      </div>
      {metadata.error && <p className="backup-error">{metadata.error}</p>}
      <article className="metadata-card">
        <div className="metadata-card-header">
          <div>
            <h3>動作確認</h3>
            <p>投稿作成と外部連携APIを受け取れる状態かを確認します。</p>
            <small>
              最終確認:{" "}
              {apiCheckedAt ? new Date(apiCheckedAt).toLocaleString("ja-JP") : "未確認"}
            </small>
          </div>
          <button type="button" onClick={runApiChecks} disabled={isCheckingApis}>
            {isCheckingApis ? "確認中" : "再確認"}
          </button>
        </div>
        <div className="api-check-list">
          {apiChecks.map((item) => (
            <div key={item.endpoint}>
              <span className={`api-check-dot ${item.status}`} />
              <strong>{item.label}</strong>
              <small>{item.endpoint}</small>
              <em>{item.detail}</em>
            </div>
          ))}
        </div>
      </article>
      {renderMetadata("投稿で使える形式", metadata.post)}
      {renderMetadata("連携文案API", metadata.message)}
    </section>
  );
}

function Composer({
  initialPost,
  mediaAssets,
  appProfiles,
  onClose,
  onBulkImport,
  onSave,
  onDelete,
}: {
  initialPost: Post | null;
  mediaAssets: MediaAsset[];
  appProfiles: Record<string, PromptAppInfo>;
  onClose: () => void;
  onBulkImport: () => void;
  onSave: (post: ComposerData) => void;
  onDelete?: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [appId, setAppId] = useState(initialPost?.app ?? "numeria");
  const [text, setText] = useState(initialPost?.text ?? "");
  const [tags, setTags] = useState(initialPost?.tags.join(" ") ?? "");
  const [date, setDate] = useState(initialPost?.isoDate ?? today);
  const [time, setTime] = useState(initialPost?.time ?? "18:00");
  const [platform, setPlatform] = useState(initialPost?.platform ?? "X");
  const [status, setStatus] = useState(initialPost?.status ?? "アイデア");
  const [imagePrompt, setImagePrompt] = useState(initialPost?.imagePrompt ?? "");
  const [reelScript, setReelScript] = useState(initialPost?.reelScript ?? "");
  const [storyIdea, setStoryIdea] = useState(initialPost?.storyIdea ?? "");
  const [workspaceId, setWorkspaceId] = useState(initialPost?.workspaceId ?? "");
  const [userId, setUserId] = useState(initialPost?.userId ?? "");
  const [ownerUserId, setOwnerUserId] = useState(initialPost?.ownerUserId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mediaIds, setMediaIds] = useState<number[]>(
    initialPost?.mediaIds ?? [],
  );
  const selectedAppName = apps.find((app) => app.id === appId)?.name ?? "投稿対象";
  const normalizedTags = tags
    .split(/[\s,#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const tagSuggestions = [
    ...(apps.find((app) => app.id === appId)?.tagSuggestions ?? []),
    ...((appProfiles[appId]?.summary ?? "")
      .split(/[、,\s]+/)
      .filter((word) => word.length >= 3)
      .slice(0, 2)),
  ].filter(
    (tag, index, array) => tag && array.indexOf(tag) === index,
  );
  const addTag = (tag: string) =>
    setTags((current) => {
      const values = current
        .split(/[\s,#]+/)
        .map((item) => item.trim().replace(/^#/, ""))
        .filter(Boolean);
      if (values.includes(tag)) return current;
      return [...values, tag].join(" ");
    });
  const canSave = Boolean(text.trim() && date && time);
  const save = () =>
    onSave({
      day: dayLabel(date),
      workspaceId,
      userId,
      ownerUserId,
      date: dateLabel(date),
      isoDate: date,
      time,
      app: appId,
      status,
      text: text.trim(),
      tags: normalizedTags,
      visual: appId,
      platform,
      mediaTags: initialPost?.mediaTags ?? [],
      imagePrompt: imagePrompt.trim(),
      reelScript: reelScript.trim(),
      storyIdea: storyIdea.trim(),
      memo: initialPost?.memo ?? "",
      postedAt: status === "投稿済み" ? initialPost?.postedAt : undefined,
      mediaIds,
    });

  return (
    <div className="modal-backdrop">
      <section
        className="composer"
        role="dialog"
        aria-modal="true"
        aria-label={initialPost ? "投稿を編集" : "新しい投稿"}
      >
        <header>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            <Icon name="chevronLeft" />
          </button>
          <h2>
            {initialPost ? "投稿を編集" : "投稿を作成"}
          </h2>
          <button className="save-link" disabled={!canSave} onClick={save}>
            保存
          </button>
        </header>
        <div className="composer-body">
          {!initialPost && (
            <div className="composer-intro">
              <strong>SNSに載せる文章を作ります</strong>
              <p>本文、ハッシュタグ、画像案、投稿予定を保存できます。</p>
            </div>
          )}
          {!initialPost && (
            <button className="composer-bulk-link" onClick={onBulkImport}>
              <span>まとめて</span>
              複数の投稿を一括登録する
            </button>
          )}
          <section className="composer-guide">
            <article>
              <span>1</span>
              <strong>内容を選ぶ</strong>
            </article>
            <article>
              <span>2</span>
              <strong>本文を書く</strong>
            </article>
            <article>
              <span>3</span>
              <strong>保存する</strong>
            </article>
          </section>
          <label className="field-label">紹介する内容</label>
          <div className="app-filter composer-apps">
            {apps.slice(1).map((app) => (
              <button
                key={app.id}
                className={`app-chip ${appId === app.id ? "selected" : ""}`}
                style={
                  appId === app.id
                    ? {
                        borderColor: app.color,
                        background: app.soft,
                        color: app.color,
                      }
                    : {}
                }
                onClick={() => setAppId(app.id)}
              >
                <AppBadge appId={app.id} size="sm" />
                <span>{app.name}</span>
              </button>
            ))}
          </div>
          <label className="prompt-field">
            <span>投稿先</span>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              {platforms.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <div className="composer-box">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="伝えたいことを書いてください…"
            />
            <span>{text.length}文字</span>
          </div>
          <label className="prompt-field">
            <span>ハッシュタグ</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="数秘術 占い師 無料相談"
            />
          </label>
          {tagSuggestions.length > 0 && (
            <div className="tag-suggestions">
              <span>タグ候補</span>
              <div>
                {tagSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={normalizedTags.includes(tag)}
                    onClick={() => addTag(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="composer-media">
            <div>
              <span>添付素材</span>
              <small>{mediaIds.length}点選択</small>
            </div>
            {mediaAssets.filter((asset) => asset.appId === appId).length ? (
              <div className="composer-media-grid">
                {mediaAssets
                  .filter((asset) => asset.appId === appId)
                  .map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className={mediaIds.includes(asset.id) ? "selected" : ""}
                      onClick={() =>
                        setMediaIds((current) =>
                          current.includes(asset.id)
                            ? current.filter((id) => id !== asset.id)
                            : [...current, asset.id],
                        )
                      }
                    >
                      {asset.mimeType.startsWith("video/") ? (
                        <video src={asset.url} muted playsInline />
                      ) : (
                        <img src={asset.url} alt={asset.name} />
                      )}
                      <span>{mediaIds.includes(asset.id) ? "✓" : "+"}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <p>「素材」メニューから画像や動画を登録できます。</p>
            )}
          </div>
          <div className="preview-card">
            <p className="field-label">投稿プレビュー</p>
            <div>
              <AppBadge appId={appId} />
              <span>
                <strong>{selectedAppName}</strong>
                <small>{platform}</small>
              </span>
            </div>
            <p>{text || "ここに投稿内容のプレビューが表示されます。"}</p>
            <div className="composer-tag-preview">
              {normalizedTags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </div>
          <details className="draft-ideas">
            <summary>画像・リール・ストーリー案</summary>
            <label className="prompt-field">
              <span>画像案</span>
              <textarea
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="例：やわらかい光の中で、相談前にスマホを見る女性。安心感のある雰囲気。"
              />
            </label>
            <label className="prompt-field">
              <span>リール案</span>
              <textarea
                value={reelScript}
                onChange={(event) => setReelScript(event.target.value)}
                placeholder="例：冒頭3秒で悩みを提示し、本文の要点を3カットで見せる。"
              />
            </label>
            <label className="prompt-field">
              <span>ストーリー案</span>
              <textarea
                value={storyIdea}
                onChange={(event) => setStoryIdea(event.target.value)}
                placeholder="例：質問スタンプで悩みを募集し、次の投稿へ誘導する。"
              />
            </label>
          </details>
          <details className="draft-ideas">
            <summary>投稿予定を設定</summary>
            <div className="form-fields">
              <label className="prompt-field">
                <span>投稿日</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <label className="prompt-field">
                <span>投稿時刻</span>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </label>
            </div>
            <label className="prompt-field">
              <span>状態</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option>アイデア</option>
                <option>作成中</option>
                <option>投稿待ち</option>
                <option>投稿済み</option>
              </select>
            </label>
          </details>
          <button
            className="composer-save-bottom"
            type="button"
            disabled={!canSave}
            onClick={() => {
              blurActiveElement();
              save();
            }}
          >
            この投稿を保存
          </button>
          {(workspaceId || userId || ownerUserId) && (
            <details className="identity-details">
              <summary>連携ID・詳細設定</summary>
              <p>
                外部から取り込んだ投稿の管理IDです。通常の投稿編集では変更不要です。
              </p>
              <div className="form-fields">
                <label className="prompt-field">
                  <span>workspaceId</span>
                  <input
                    value={workspaceId}
                    onChange={(event) => setWorkspaceId(event.target.value)}
                  />
                </label>
                <label className="prompt-field">
                  <span>userId</span>
                  <input
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                  />
                </label>
              </div>
              <label className="prompt-field">
                <span>ownerUserId</span>
                <input
                  value={ownerUserId}
                  onChange={(event) => setOwnerUserId(event.target.value)}
                />
              </label>
            </details>
          )}
          {onDelete && (
            <div className="delete-post-area">
              {confirmDelete ? (
                <div className="confirm-box">
                  <p>この投稿を削除します。この操作は元に戻せません。</p>
                  <div>
                    <button onClick={() => setConfirmDelete(false)}>
                      戻る
                    </button>
                    <button className="danger-solid" onClick={onDelete}>
                      削除する
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="danger-outline"
                  onClick={() => setConfirmDelete(true)}
                >
                  この投稿を削除
                </button>
              )}
            </div>
          )}
          {!canSave && (
            <p className="save-helper">本文を書くと保存できます。</p>
          )}
        </div>
        <footer>
          <button
            className="secondary large"
            onClick={() => {
              blurActiveElement();
              onClose();
            }}
          >
            キャンセル
          </button>
          <button
            className="import-button"
            disabled={!canSave}
            onClick={() => {
              blurActiveElement();
              save();
            }}
          >
            {initialPost ? "変更を保存" : "投稿を登録"}
          </button>
        </footer>
      </section>
    </div>
  );
}

const exampleJson = `{
  "schema_version": "1.0",
  "workspace_id": "wks_123",
  "user_id": "user_123",
  "week_start": "2026-07-13",
  "posts": [
    {
      "scheduled_date": "2026-07-13",
      "scheduled_time": "18:00",
      "platform": "X",
      "subject_id": "numeria",
      "app_id": "numeria",
      "landing_url": "https://example.com",
      "content": "投稿本文をここに入れます",
      "hashtags": ["数秘術", "占い師"],
      "image_prompt": "画像案をここに入れます",
      "reel_script": "リール案をここに入れます",
      "story": "ストーリー案をここに入れます",
      "status": "投稿待ち",
      "media_tags": ["鑑定書", "機能紹介"],
      "memo": "機能紹介の投稿"
    }
  ]
}`;

const growthRequestExampleJson = `{
  "workspaceId": "wks_123",
  "userId": "user_123",
  "ownerUserId": "owner_user_123",
  "campaignId": "cmp_123",
  "objective": "line_registration",
  "channel": "instagram",
  "target": {
    "age": "30代",
    "gender": "女性",
    "interest": "恋愛"
  },
  "topic": "恋愛相談",
  "cta": "無料相談はこちら",
  "series": "恋愛シリーズ",
  "tone": "やさしく安心感のある文体",
  "constraints": "不安を煽らない。断定しすぎない。",
  "dueDate": "2026-08-15"
}`;

type PromptAppInfo = {
  url: string;
  summary: string;
  target: string;
  problem: string;
  features: string;
  strength: string;
  cta: string;
};

const platforms = [
  "X",
  "Instagram",
  "Threads",
  "Facebook",
  "LinkedIn",
] as const;

const platformDirections: Record<string, string> = {
  X: "冒頭で関心を引き、短く要点を伝える。URLを本文に入れ、ハッシュタグは少数に絞る。",
  Instagram:
    "読みやすい改行と共感できる導入を使う。画像案をmedia_tagsに入れ、本文ではプロフィールのリンクへ誘導する。",
  Threads:
    "会話を始めるような自然な口調で、短い段落に分ける。売り込みを強くしすぎない。",
  Facebook:
    "背景や利用場面を少し詳しく説明し、信頼できる語り口でURLへの行動を促す。",
  LinkedIn:
    "対象者の業務課題、得られる効果、活用場面を明確にし、ビジネス向けの落ち着いた文体にする。",
};

const appPromptProfiles: Record<string, PromptAppInfo> = {
  numeria: {
    url: "",
    summary: "占い師向けの数秘術鑑定書作成ツール",
    target: "数秘術の鑑定を行う個人の占い師",
    problem: "数秘術の計算や鑑定文、鑑定書の作成に時間がかかる",
    features: "数秘術の自動計算、鑑定内容の作成支援、PDF鑑定書の作成",
    strength: "計算から鑑定書作成までを一つの流れで完結できる",
    cta: "詳細を見る・試してみる",
  },
  tukuttee: {
    url: "",
    summary: "欲しいアプリのアイデアを投稿し、共感する人を集めるサービス",
    target: "欲しいアプリがある人、日常の不便を解決したい人",
    problem: "アプリのアイデアがあっても、作れる人へ届ける場所がない",
    features: "アイデア投稿、共感の可視化、開発者とのマッチング",
    strength: "利用者の『欲しい』を起点にアプリ開発へつなげられる",
    cta: "欲しいアプリのアイデアを投稿する",
  },
  tukuttaa: {
    url: "",
    summary: "需要が見えるアプリアイデアを探せる開発者向けサービス",
    target: "個人開発者、これからアプリを作りたい人",
    problem: "作った後に需要がないと分かるリスクがある",
    features: "アイデア検索、共感数の確認、開発候補の発見",
    strength: "開発前に利用者の需要を確かめられる",
    cta: "需要のあるアプリアイデアを探す",
  },
};

function buildAiPrompt(
  startDate: string,
  endDate: string,
  workspaceId: string,
  userId: string,
  ownerUserId: string,
  appId: string,
  theme: string,
  info: PromptAppInfo,
  platform: string,
  purpose: string,
  targetAudience: string,
  cta: string,
  tone: string,
  constraints: string,
) {
  const app = apps.find((item) => item.id === appId);
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const postCount =
    !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
      ? Math.max(
          1,
          Math.floor((end.getTime() - start.getTime()) / 86400000) + 1,
        )
      : 7;

  return `あなたはSNS投稿作成アシスタントです。外部から渡された作成条件を、SNS投稿案へ変換してください。

【受け取った作成条件】
- workspaceId：${workspaceId.trim() || "未接続"}
- userId：${userId.trim() || "未接続"}
- ownerUserId：${ownerUserId.trim() || "未接続"}
- purpose：${purpose.trim() || "未指定"}
- targetAudience：${targetAudience.trim() || info.target || "未指定"}
- cta：${cta.trim() || info.cta || "未指定"}
- channel：${platform}
- tone：${tone.trim() || "自然でわかりやすい"}
- constraints：${constraints.trim() || "特になし"}

重要：
- 外部連携IDは本文に出さない
- 投稿、投稿履歴、素材はworkspaceId + userIdを基本スコープにする
- purpose、targetAudience、cta、channel、tone、constraintsは変更しない
- 目的、対象、案内文の判断は行わず、渡された条件をそのまま使う
- 入力条件を投稿本文、ハッシュタグ、画像案、リール案、ストーリー案へ変換する

【対象コンテンツ】
- subjectId：${appId}
- コンテンツ名：${app?.name ?? appId}
- リンク先URL：${info.url || "未入力"}
- 概要：${info.summary}
- 想定読者・対象者：${info.target}
- 扱う課題：${info.problem}
- 主な内容・提供価値：${info.features}
- 見せ方・特徴：${info.strength}
- 標準CTA：${info.cta}

【投稿テーマ】
${theme.trim() || "投稿対象コンテンツの魅力・使い方・利用者の悩み解決"}

【投稿先SNS】
- SNS：${platform}
- SNSに合わせた作成方針：${platformDirections[platform]}

【作成条件】
- 期間：${startDate}〜${endDate}
- 1日1投稿、合計${postCount}投稿
- ${platform === "Instagram" ? `contentではプロフィールのリンクへ誘導し、landing_urlには「${info.url || "未入力"}」を入れる` : `各投稿のcontentにリンク先URL「${info.url || "未入力"}」を自然に1回含める`}
- 投稿の最後はctaを自然に促す
- constraintsに指定された制約を優先する
- contentにハッシュタグを含めない
- hashtagsの各要素に#を付けない
- workspace_idは「${workspaceId.trim() || "wks_123"}」に統一する
- user_idは「${userId.trim() || "user_123"}」に統一する
- owner_user_idは「${ownerUserId.trim() || "owner_user_123"}」に統一する
- professional_idは出力しない
- subject_idは「${appId}」に統一する
- 互換用にapp_idにも「${appId}」を入れる
- platformは「${platform}」に統一する
- landing_urlは「${info.url || "未入力"}」に統一する
- image_promptには画像生成や素材選定に使える具体的な画像案を入れる
- reel_scriptには短尺動画の構成案を入れる
- storyにはストーリー投稿の構成案を入れる
- statusは「投稿待ち」
- JSON以外の説明文やMarkdownコードブロックは出力しない

【出力形式】
${exampleJson.replace("投稿本文をここに入れます", `投稿本文。${info.url || "https://example.com"}`)}`;
}

type ImportedJsonPost = {
  workspace_id?: unknown;
  user_id?: unknown;
  owner_user_id?: unknown;
  scheduled_date?: unknown;
  scheduled_time?: unknown;
  subject_id?: unknown;
  app_id?: unknown;
  content?: unknown;
  hashtags?: unknown;
  status?: unknown;
  media_tags?: unknown;
  image_prompt?: unknown;
  imagePrompt?: unknown;
  reel_script?: unknown;
  reelScript?: unknown;
  story?: unknown;
  story_idea?: unknown;
  storyIdea?: unknown;
  memo?: unknown;
  platform?: unknown;
};

type GrowthEngineRequest = {
  workspaceId?: unknown;
  workspace_id?: unknown;
  userId?: unknown;
  user_id?: unknown;
  ownerUserId?: unknown;
  owner_user_id?: unknown;
  campaignId?: unknown;
  campaign_id?: unknown;
  objective?: unknown;
  purpose?: unknown;
  channel?: unknown;
  target?: unknown;
  targetAudience?: unknown;
  target_audience?: unknown;
  topic?: unknown;
  cta?: unknown;
  series?: unknown;
  tone?: unknown;
  constraints?: unknown;
  dueDate?: unknown;
  due_date?: unknown;
  subjectId?: unknown;
  subject_id?: unknown;
  appId?: unknown;
  app_id?: unknown;
};

function textValue(...values: unknown[]) {
  const match = values.find(
    (value) => typeof value === "string" && value.trim(),
  );
  return typeof match === "string" ? match.trim() : "";
}

function normalizeChannel(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  const match = platforms.find((item) => item.toLowerCase() === normalized);
  return match ?? "";
}

function targetToText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";
  const target = value as Record<string, unknown>;
  return [
    textValue(target.age),
    textValue(target.gender),
    textValue(target.interest),
    textValue(target.segment),
    textValue(target.problem),
  ]
    .filter(Boolean)
    .join(" / ");
}

function objectiveLabel(value: string) {
  const labels: Record<string, string> = {
    awareness: "認知",
    line_registration: "LINE登録",
    free_consultation: "無料相談",
    reservation: "予約",
    repeat: "リピート",
    referral: "紹介",
  };
  return labels[value] ?? value;
}

function parseGrowthEngineRequest(raw: string):
  | { request: GrowthEngineRequest; error: "" }
  | { request: null; error: string } {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed: unknown = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { request: null, error: "JSONオブジェクトを貼り付けてください。" };
    }
    return { request: parsed as GrowthEngineRequest, error: "" };
  } catch {
    return { request: null, error: "依頼メモJSONの形式を確認してください。" };
  }
}

function dateLabel(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function dayLabel(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "未定";
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
    return "今日";
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function validateImport(raw: string): { posts: Post[]; errors: string[] } {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed: unknown = JSON.parse(cleaned);
    const source = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" &&
          parsed !== null &&
          Array.isArray((parsed as { posts?: unknown }).posts)
        ? (parsed as { posts: unknown[] }).posts
        : null;
    const rootMeta =
      typeof parsed === "object" && parsed !== null
        ? (parsed as ImportedJsonPost)
        : {};
    if (!source) return { posts: [], errors: ["posts配列が見つかりません。"] };
    const errors: string[] = [];
    const result: Post[] = [];
    source.forEach((item, index) => {
      const value = item as ImportedJsonPost;
      const workspaceId =
        typeof value.workspace_id === "string"
          ? value.workspace_id
          : typeof rootMeta.workspace_id === "string"
            ? rootMeta.workspace_id
            : "";
      const userId =
        typeof value.user_id === "string"
          ? value.user_id
          : typeof rootMeta.user_id === "string"
            ? rootMeta.user_id
            : "";
      const ownerUserId =
        typeof value.owner_user_id === "string"
          ? value.owner_user_id
          : typeof rootMeta.owner_user_id === "string"
            ? rootMeta.owner_user_id
            : "";
      const required = [
        value.scheduled_date,
        value.scheduled_time,
        value.subject_id ?? value.app_id,
        value.content,
      ];
      if (
        required.some((field) => typeof field !== "string" || !field.trim())
      ) {
        errors.push(
          `${index + 1}件目：日付・時刻・subject_id・本文を確認してください。`,
        );
        return;
      }
      const appId = String(value.subject_id ?? value.app_id);
      if (!apps.some((app) => app.id === appId && app.id !== "all")) {
        errors.push(
          `${index + 1}件目：subject_id「${appId}」は登録されていません。`,
        );
        return;
      }
      const isoDate = String(value.scheduled_date);
      result.push({
        id: Date.now() + index,
        workspaceId,
        userId,
        ownerUserId,
        day: dayLabel(isoDate),
        date: dateLabel(isoDate),
        isoDate,
        time: String(value.scheduled_time),
        app: appId,
        status: typeof value.status === "string" ? value.status : "投稿待ち",
        text: String(value.content),
        tags: Array.isArray(value.hashtags)
          ? value.hashtags
              .filter((tag): tag is string => typeof tag === "string")
              .map((tag) => tag.replace(/^#/, ""))
          : [],
        visual: appId,
        mediaTags: Array.isArray(value.media_tags)
          ? value.media_tags.filter(
              (tag): tag is string => typeof tag === "string",
            )
          : [],
        imagePrompt:
          typeof value.image_prompt === "string"
            ? value.image_prompt
            : typeof value.imagePrompt === "string"
              ? value.imagePrompt
              : "",
        reelScript:
          typeof value.reel_script === "string"
            ? value.reel_script
            : typeof value.reelScript === "string"
              ? value.reelScript
              : "",
        storyIdea:
          typeof value.story === "string"
            ? value.story
            : typeof value.story_idea === "string"
              ? value.story_idea
              : typeof value.storyIdea === "string"
                ? value.storyIdea
                : "",
        memo: typeof value.memo === "string" ? value.memo : "",
        platform:
          typeof value.platform === "string" &&
          platforms.includes(value.platform as (typeof platforms)[number])
            ? value.platform
            : "X",
      });
    });
    return { posts: result, errors };
  } catch {
    return {
      posts: [],
      errors: [
        "JSONの形式を確認してください。カンマや引用符が不足している可能性があります。",
      ],
    };
  }
}

function BulkImport({
  onClose,
  onImport,
  profiles,
  requestHistory,
  onSaveProfile,
  onSaveRequest,
}: {
  onClose: () => void;
  onImport: (posts: Post[]) => void;
  profiles: Record<string, PromptAppInfo>;
  requestHistory: GrowthRequestHistory[];
  onSaveProfile: (appId: string, profile: PromptAppInfo) => void;
  onSaveRequest: (request: GrowthRequestHistory) => void;
}) {
  const initialRange = useMemo(() => {
    const start = mondayOf(new Date());
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: localIso(start), end: localIso(end) };
  }, []);
  const [json, setJson] = useState("");
  const [growthRequestJson, setGrowthRequestJson] = useState("");
  const [growthRequestError, setGrowthRequestError] = useState("");
  const [growthRequestStatus, setGrowthRequestStatus] = useState("");
  const [result, setResult] = useState<{
    posts: Post[];
    errors: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [workspaceId, setWorkspaceId] = useState("wks_local");
  const [userId, setUserId] = useState("user_local");
  const [ownerUserId, setOwnerUserId] = useState("owner_user_local");
  const [targetApp, setTargetApp] = useState("numeria");
  const [theme, setTheme] = useState("");
  const [appInfo, setAppInfo] = useState<PromptAppInfo>(profiles.numeria);
  const [platform, setPlatform] = useState("X");
  const [purpose, setPurpose] = useState("投稿対象コンテンツの認知を増やす");
  const [targetAudience, setTargetAudience] = useState(profiles.numeria.target);
  const [cta, setCta] = useState(profiles.numeria.cta);
  const [tone, setTone] = useState("自然でわかりやすい");
  const [constraints, setConstraints] = useState("");

  const generatedPrompt = useMemo(
    () =>
      buildAiPrompt(
        startDate,
        endDate,
        workspaceId,
        userId,
        ownerUserId,
        targetApp,
        theme,
        appInfo,
        platform,
        purpose,
        targetAudience,
        cta,
        tone,
        constraints,
      ),
    [
      startDate,
      endDate,
      workspaceId,
      userId,
      ownerUserId,
      targetApp,
      theme,
      appInfo,
      platform,
      purpose,
      targetAudience,
      cta,
      tone,
      constraints,
    ],
  );
  const dateError = Boolean(startDate && endDate && endDate < startDate);
  const updateInfo = (key: keyof PromptAppInfo, value: string) =>
    setAppInfo((current) => ({ ...current, [key]: value }));

  const copyPrompt = async () => {
    if (dateError) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const checkJson = () => setResult(validateImport(json));
  const saveGrowthRequest = (request: GrowthEngineRequest) => {
    const title =
      [
        textValue(request.series),
        textValue(request.topic),
        textValue(request.campaignId, request.campaign_id),
      ]
        .filter(Boolean)
        .join(" / ") || "依頼メモ";
    onSaveRequest({
      id: Date.now(),
      savedAt: new Date().toISOString(),
      title,
      raw: growthRequestJson.trim(),
    });
  };
  const applyGrowthRequest = () => {
    const parsed = parseGrowthEngineRequest(growthRequestJson);
    if (parsed.error) {
      setGrowthRequestError(parsed.error);
      setGrowthRequestStatus("");
      return;
    }
    const request = parsed.request;
    setWorkspaceId(textValue(request.workspaceId, request.workspace_id) || workspaceId);
    setUserId(textValue(request.userId, request.user_id) || userId);
    setOwnerUserId(
      textValue(request.ownerUserId, request.owner_user_id) || ownerUserId,
    );
    const nextApp = textValue(request.subjectId, request.subject_id, request.appId, request.app_id);
    if (nextApp && apps.some((app) => app.id === nextApp && app.id !== "all")) {
      setTargetApp(nextApp);
      setAppInfo(profiles[nextApp]);
      setTargetAudience(profiles[nextApp].target);
      setCta(profiles[nextApp].cta);
    }
    const nextPlatform = normalizeChannel(request.channel);
    if (nextPlatform) setPlatform(nextPlatform);
    const nextPurpose = textValue(request.purpose, request.objective);
    if (nextPurpose) setPurpose(objectiveLabel(nextPurpose));
    const nextTarget = textValue(request.targetAudience, request.target_audience) || targetToText(request.target);
    if (nextTarget) setTargetAudience(nextTarget);
    const nextCta = textValue(request.cta);
    if (nextCta) setCta(nextCta);
    const nextTone = textValue(request.tone);
    if (nextTone) setTone(nextTone);
    const nextConstraints = textValue(request.constraints);
    if (nextConstraints) setConstraints(nextConstraints);
    const nextTopic = [
      textValue(request.series),
      textValue(request.topic),
    ].filter(Boolean).join(" / ");
    if (nextTopic) setTheme(nextTopic);
    const dueDate = textValue(request.dueDate, request.due_date);
    if (dueDate) {
      setStartDate(dueDate);
      setEndDate(dueDate);
    }
    const campaign = textValue(request.campaignId, request.campaign_id);
    saveGrowthRequest(request);
    setGrowthRequestError("");
    setGrowthRequestStatus(
      campaign ? `反映しました：${campaign}` : "依頼メモを反映しました。",
    );
  };

  return (
    <div className="modal-backdrop">
      <section
        className="bulk-import"
        role="dialog"
        aria-modal="true"
        aria-label="AI投稿を一括登録"
      >
        <header>
          <button className="icon-button" onClick={onClose} aria-label="閉じる">
            <Icon name="chevronLeft" />
          </button>
          <div>
            <p className="eyebrow">BULK CREATE</p>
            <h2>投稿をまとめて作る</h2>
          </div>
          <span className="step-count">期間指定</span>
        </header>
        <div className="bulk-body">
          <section className="bulk-intro">
            <strong>まとめて登録の流れ</strong>
            <div>
              <span>1. 条件を決める</span>
              <span>2. プロンプトをコピー</span>
              <span>3. AIのJSONを貼る</span>
              <span>4. 確認して登録</span>
            </div>
          </section>
          <section className="bulk-step">
            <div className="step-title">
              <span>1</span>
              <div>
                <h3>作成条件を入力</h3>
                <p>日付・投稿対象・テーマから専用プロンプトを作ります。</p>
              </div>
            </div>
            <div className="prompt-settings">
              <details className="growth-request-panel">
                <summary>依頼メモから入力</summary>
                <p>
                  外部から受け取った目的・対象・案内文を貼り付けると、作成条件へ反映します。
                </p>
                <textarea
                  className="growth-request-input"
                  value={growthRequestJson}
                  onChange={(event) => {
                    setGrowthRequestJson(event.target.value);
                    setGrowthRequestError("");
                    setGrowthRequestStatus("");
                  }}
                  placeholder={growthRequestExampleJson}
                />
                <div className="growth-request-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setGrowthRequestJson(growthRequestExampleJson);
                      setGrowthRequestError("");
                      setGrowthRequestStatus("");
                    }}
                  >
                    入力例
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!growthRequestJson.trim()}
                    onClick={applyGrowthRequest}
                  >
                    条件へ反映
                  </button>
                </div>
                {requestHistory.length > 0 && (
                  <div className="growth-history-list">
                    <strong>保存済みの依頼メモ</strong>
                    {requestHistory.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setGrowthRequestJson(item.raw);
                          setGrowthRequestError("");
                          setGrowthRequestStatus("保存済みの依頼メモを読み込みました。");
                        }}
                      >
                        <span>{item.title}</span>
                        <small>
                          {new Date(item.savedAt).toLocaleDateString("ja-JP")}
                        </small>
                      </button>
                    ))}
                  </div>
                )}
                {growthRequestError && (
                  <p className="field-error">{growthRequestError}</p>
                )}
                {growthRequestStatus && (
                  <p className="field-success">{growthRequestStatus}</p>
                )}
              </details>
              <div className="date-range">
                <label>
                  <span>開始日</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>
                <i>〜</i>
                <label>
                  <span>終了日</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </label>
              </div>
              {dateError && (
                <p className="field-error">
                  終了日は開始日以降にしてください。
                </p>
              )}
              <label className="prompt-field">
                <span>対象コンテンツ</span>
                <select
                  value={targetApp}
                  onChange={(event) => {
                    const next = event.target.value;
                    setTargetApp(next);
                    setAppInfo(profiles[next]);
                    setTargetAudience(profiles[next].target);
                    setCta(profiles[next].cta);
                  }}
                >
                  {apps.slice(1).map((app) => (
                    <option value={app.id} key={app.id}>
                      {app.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="platform-select">
                <span>投稿先SNS</span>
                <div>
                  {platforms.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={platform === item ? "selected" : ""}
                      onClick={() => setPlatform(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <p>{platformDirections[platform]}</p>
              </div>
              <div className="app-info-panel contract-request-panel">
                <div className="app-info-title">
                  <strong>投稿の条件</strong>
                  <span>目的・相手・案内文をもとに投稿案を作ります。</span>
                </div>
                <label className="prompt-field">
                  <span>投稿目的</span>
                  <input
                    value={purpose}
                    onChange={(event) => setPurpose(event.target.value)}
                    placeholder="例：LINE登録、無料相談、予約"
                  />
                </label>
                <label className="prompt-field">
                  <span>届ける相手</span>
                  <textarea
                    value={targetAudience}
                    onChange={(event) => setTargetAudience(event.target.value)}
                    placeholder="例：30代女性、恋愛相談に関心がある"
                  />
                </label>
                <label className="prompt-field">
                  <span>誘導文言</span>
                  <input
                    value={cta}
                    onChange={(event) => setCta(event.target.value)}
                    placeholder="例：無料相談はこちら"
                  />
                </label>
                <label className="prompt-field">
                  <span>文体</span>
                  <input
                    value={tone}
                    onChange={(event) => setTone(event.target.value)}
                    placeholder="例：やさしい、専門的、親しみやすい"
                  />
                </label>
                <label className="prompt-field">
                  <span>制約・注意点</span>
                  <textarea
                    value={constraints}
                    onChange={(event) => setConstraints(event.target.value)}
                    placeholder="例：不安を煽らない、本文は120字以内、絵文字は使わない"
                  />
                </label>
              </div>
              <div className="app-info-panel">
                <div className="app-info-title">
                  <strong>AIに渡すコンテンツ情報</strong>
                  <span>選択した投稿対象の初期情報を編集できます</span>
                </div>
                <label className="prompt-field">
                  <span>導線先URL</span>
                  <input
                    type="url"
                    value={appInfo.url}
                    onChange={(event) => updateInfo("url", event.target.value)}
                    placeholder="https://example.com"
                  />
                </label>
                <label className="prompt-field">
                  <span>コンテンツ概要</span>
                  <textarea
                    value={appInfo.summary}
                    onChange={(event) =>
                      updateInfo("summary", event.target.value)
                    }
                  />
                </label>
                <label className="prompt-field">
                  <span>想定読者・対象者</span>
                  <textarea
                    value={appInfo.target}
                    onChange={(event) =>
                      updateInfo("target", event.target.value)
                    }
                  />
                </label>
                <label className="prompt-field">
                  <span>扱う課題</span>
                  <textarea
                    value={appInfo.problem}
                    onChange={(event) =>
                      updateInfo("problem", event.target.value)
                    }
                  />
                </label>
                <label className="prompt-field">
                  <span>主な内容・提供価値</span>
                  <textarea
                    value={appInfo.features}
                    onChange={(event) =>
                      updateInfo("features", event.target.value)
                    }
                  />
                </label>
                <label className="prompt-field">
                  <span>見せ方・特徴</span>
                  <textarea
                    value={appInfo.strength}
                    onChange={(event) =>
                      updateInfo("strength", event.target.value)
                    }
                  />
                </label>
                <label className="prompt-field">
                  <span>標準CTA</span>
                  <input
                    value={appInfo.cta}
                    onChange={(event) => updateInfo("cta", event.target.value)}
                    placeholder="例：無料で試す"
                  />
                </label>
              </div>
              <label className="prompt-field">
                <span>投稿テーマ</span>
                <textarea
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  placeholder="例：無料相談の案内、記事の要点、メニューの活用場面"
                />
              </label>
              <details className="prompt-preview integration-settings">
                <summary>連携ID・詳細設定</summary>
                <div className="integration-body">
                  <p>
                    外部連携時だけ使う管理情報です。通常の投稿作成では変更不要です。
                  </p>
                  <div className="form-fields">
                    <label className="prompt-field">
                      <span>workspaceId</span>
                      <input
                        value={workspaceId}
                        onChange={(event) => setWorkspaceId(event.target.value)}
                        placeholder="例：wks_123"
                      />
                    </label>
                    <label className="prompt-field">
                      <span>userId</span>
                      <input
                        value={userId}
                        onChange={(event) => setUserId(event.target.value)}
                        placeholder="例：user_123"
                      />
                    </label>
                  </div>
                  <label className="prompt-field">
                    <span>ownerUserId</span>
                    <input
                      value={ownerUserId}
                      onChange={(event) => setOwnerUserId(event.target.value)}
                      placeholder="例：owner_user_123"
                    />
                  </label>
                  <p className="profile-help">
                    外部連携用のIDです。通常の投稿作成では変更不要です。
                  </p>
                </div>
              </details>
              <details className="prompt-preview">
                <summary>作成されるプロンプトを確認</summary>
                <pre>{generatedPrompt}</pre>
              </details>
            </div>
            <button
              className={`copy-prompt ${copied ? "done" : ""}`}
              onClick={() => {
                onSaveProfile(targetApp, appInfo);
                copyPrompt();
              }}
              disabled={
                dateError || !startDate || !endDate
              }
            >
              {copied
                ? "保存・コピーしました"
                : "情報を保存してプロンプトをコピー"}
            </button>
          </section>
          <div className="flow-arrow">↓</div>
          <section className="bulk-step">
            <div className="step-title">
              <span>2</span>
              <div>
                <h3>AIの回答を貼り付け</h3>
                <p>文章ではなく、JSONの部分だけを貼り付けてください。</p>
              </div>
            </div>
            <div className="json-helper">
              <strong>貼り付けるもの</strong>
              <p>{"[{ \"date\": \"2026-08-17\", \"text\": \"...\" }]"} のような配列形式です。</p>
            </div>
            <textarea
              className="json-input"
              value={json}
              onChange={(event) => {
                setJson(event.target.value);
                setResult(null);
              }}
              placeholder={exampleJson}
            />
            <div className="json-tools">
              <button
                onClick={() => {
                  setJson(exampleJson);
                  setResult(null);
                }}
              >
                入力例を表示
              </button>
              <button
                className="check-json"
                onClick={checkJson}
                disabled={!json.trim()}
              >
                内容を確認
              </button>
            </div>
          </section>
          {json.trim() && !result && (
            <section className="import-result waiting">
              <div className="result-head">
                <strong>まだ確認していません</strong>
                <span>?</span>
              </div>
              <p>「内容を確認」を押すと、登録できる投稿数と修正点を表示します。</p>
            </section>
          )}
          {result && (
            <section
              className={`import-result ${result.errors.length ? "has-error" : "valid"}`}
            >
              <div className="result-head">
                <strong>
                  {result.errors.length
                    ? "修正が必要です"
                    : `${result.posts.length}件を登録できます`}
                </strong>
                <span>{result.errors.length ? "!" : "✓"}</span>
              </div>
              {result.errors.length > 0 ? (
                <ul>
                  {result.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : (
                <div className="import-preview">
                  {result.posts.map((post) => (
                    <article key={post.id}>
                      <div>
                        <AppBadge appId={post.app} size="sm" />
                        <span>
                          <strong>{post.date}</strong>
                          <small>
                            {post.time}・{post.platform ?? "X"}・
                            {apps.find((app) => app.id === post.app)?.name}
                          </small>
                        </span>
                      </div>
                      <p>{post.text}</p>
                      <div>
                        {post.tags.map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          <div className="bulk-inline-actions">
            <button
              type="button"
              className="secondary large"
              onClick={() => {
                blurActiveElement();
                onClose();
              }}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="import-button"
              disabled={
                !result || result.errors.length > 0 || result.posts.length === 0
              }
              onClick={() => {
                blurActiveElement();
                if (result) onImport(result.posts);
              }}
            >
              {result?.posts.length || 0}件を登録
            </button>
          </div>
        </div>
        <footer>
          <button
            className="secondary large"
            onClick={() => {
              blurActiveElement();
              onClose();
            }}
          >
            キャンセル
          </button>
          <button
            className="import-button"
            disabled={
              !result || result.errors.length > 0 || result.posts.length === 0
            }
            onClick={() => {
              blurActiveElement();
              if (result) onImport(result.posts);
            }}
          >
            <Icon name="plus" size={18} />
            {result?.posts.length || 0}件を登録する
          </button>
        </footer>
      </section>
    </div>
  );
}
