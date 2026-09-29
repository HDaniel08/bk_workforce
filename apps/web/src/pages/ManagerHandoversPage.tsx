import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createHandoverPost,
  createHandoverReply,
  deleteHandoverPost,
  deleteHandoverReply,
  getHandoverDay,
  getHandoverManagers,
  getHandoverTags,
  searchHandovers,
  updateHandoverPost,
  updateHandoverReply,
  type HandoverPerson,
  type HandoverPost,
  type HandoverReply
} from "../api/handovers";
import { HandoverEditor } from "../components/handovers/HandoverEditor";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { authStore } from "../store/auth-store";

type EditorValue = { content: string; mentionUserIds: string[] };
type ViewMode = "day" | "search";

function currentHandoverDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const dateValue = `${get("year")}-${get("month")}-${get("day")}`;
  return Number(get("hour")) < 6 ? addDays(dateValue, -1) : dateValue;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function wasEdited(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;
}

function initials(person: HandoverPerson) {
  return `${person.lastName.charAt(0)}${person.firstName.charAt(0)}`.toLocaleUpperCase("hu-HU");
}

function visibleMessage(content: string) {
  return content
    .replace(/(^|\s)#[\p{L}\p{N}_-]{1,50}/gu, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function renderMessage(content: string) {
  return visibleMessage(content)
    .split(/(@[\p{L}\p{N}_-]+)/gu)
    .map((part, index) =>
      part.startsWith("@") ? <strong key={`${part}-${index}`}>{part}</strong> : part
    );
}

export function ManagerHandoversPage() {
  const user = authStore.getUser();
  const [urlSearchParams] = useSearchParams();
  const requestedDate = urlSearchParams.get("date");
  const [mode, setMode] = useState<ViewMode>("day");
  const [date, setDate] = useState(() =>
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : currentHandoverDate()
  );
  const [currentDate, setCurrentDate] = useState(currentHandoverDate);
  const [posts, setPosts] = useState<HandoverPost[]>([]);
  const [results, setResults] = useState<HandoverPost[]>([]);
  const [managers, setManagers] = useState<HandoverPerson[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newPost, setNewPost] = useState<EditorValue>({ content: "", mentionUserIds: [] });
  const [editingPost, setEditingPost] = useState<{ id: string; value: EditorValue } | null>(null);
  const [editingReply, setEditingReply] = useState<{ id: string; value: EditorValue } | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(() => new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, EditorValue>>({});
  const [searchText, setSearchText] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [searchAuthor, setSearchAuthor] = useState("");
  const [searchMention, setSearchMention] = useState("");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const pendingScrollId = useRef<string | null>(null);
  const notificationTarget = urlSearchParams.toString();

  async function loadDay(selectedDate = date) {
    setLoading(true);
    setError(null);
    try {
      const day = await getHandoverDay(selectedDate);
      setPosts(day.posts);
      setCurrentDate(day.currentHandoverDate);
    } catch {
      setError("Az átadó betöltése nem sikerült.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshTags() {
    setTags(await getHandoverTags());
  }

  useEffect(() => {
    Promise.all([getHandoverManagers(), getHandoverTags()])
      .then(([managerList, tagList]) => {
        setManagers(managerList);
        setTags(tagList);
      })
      .catch(() => setError("A manager- és taglista betöltése nem sikerült."));
  }, []);

  useEffect(() => {
    const targetDate = urlSearchParams.get("date");
    const postId = urlSearchParams.get("post");
    const replyId = urlSearchParams.get("reply");
    if (!targetDate || !postId || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return;
    setMode("day");
    setDate(targetDate);
    setHighlightedPostId(postId);
    setExpandedReplies(replyId ? postId : null);
    pendingScrollId.current = replyId
      ? `handover-reply-${replyId}`
      : `handover-post-${postId}`;
    const timeoutId = window.setTimeout(() => setHighlightedPostId(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [notificationTarget]);

  useEffect(() => {
    if (mode === "day") void loadDay(date);
  }, [date, mode]);

  useEffect(() => {
    const id = pendingScrollId.current;
    if (!id || loading) return;
    const itemExists = posts.some((post) =>
      id === `handover-post-${post.id}` || post.replies.some((reply) => id === `handover-reply-${reply.id}`)
    );
    if (!itemExists) return;
    pendingScrollId.current = null;
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [loading, posts]);

  function showError() {
    setError("A művelet nem sikerült. Ellenőrizd a tartalmat, majd próbáld újra.");
  }

  async function submitPost() {
    if (!newPost.content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createHandoverPost(date, newPost);
      setPosts((items) => [...items, created]);
      setNewPost({ content: "", mentionUserIds: [] });
      setComposerOpen(false);
      pendingScrollId.current = `handover-post-${created.id}`;
      await refreshTags();
    } catch {
      showError();
    } finally {
      setSaving(false);
    }
  }

  async function savePost() {
    if (!editingPost?.value.content.trim()) return;
    setSaving(true);
    try {
      const updated = await updateHandoverPost(editingPost.id, editingPost.value);
      setPosts((items) => items.map((post) => post.id === updated.id ? updated : post));
      setEditingPost(null);
      await refreshTags();
    } catch {
      showError();
    } finally {
      setSaving(false);
    }
  }

  async function removePost(post: HandoverPost) {
    if (!window.confirm("Biztosan törlöd ezt a posztot és az összes válaszát? A törlés nem vonható vissza.")) return;
    setSaving(true);
    try {
      await deleteHandoverPost(post.id);
      setPosts((items) => items.filter((item) => item.id !== post.id));
      await refreshTags();
    } catch {
      showError();
    } finally {
      setSaving(false);
    }
  }

  async function submitReply(postId: string) {
    const draft = replyDrafts[postId];
    if (!draft?.content.trim()) return;
    setSaving(true);
    try {
      const reply = await createHandoverReply(postId, draft);
      setPosts((items) => items.map((post) => post.id === postId ? { ...post, replies: [...post.replies, reply] } : post));
      setReplyDrafts((drafts) => ({ ...drafts, [postId]: { content: "", mentionUserIds: [] } }));
      setReplyingTo(null);
      setExpandedReplies(postId);
      pendingScrollId.current = `handover-reply-${reply.id}`;
      await refreshTags();
    } catch {
      showError();
    } finally {
      setSaving(false);
    }
  }

  async function saveReply(postId: string) {
    if (!editingReply?.value.content.trim()) return;
    setSaving(true);
    try {
      const updated = await updateHandoverReply(editingReply.id, editingReply.value);
      setPosts((items) => items.map((post) => post.id === postId ? {
        ...post,
        replies: post.replies.map((reply) => reply.id === updated.id ? updated : reply)
      } : post));
      setEditingReply(null);
      await refreshTags();
    } catch {
      showError();
    } finally {
      setSaving(false);
    }
  }

  async function removeReply(postId: string, reply: HandoverReply) {
    if (!window.confirm("Biztosan végleg törlöd ezt a választ?")) return;
    setSaving(true);
    try {
      await deleteHandoverReply(reply.id);
      setPosts((items) => items.map((post) => post.id === postId ? {
        ...post,
        replies: post.replies.filter((item) => item.id !== reply.id)
      } : post));
      await refreshTags();
    } catch {
      showError();
    } finally {
      setSaving(false);
    }
  }

  async function runSearch(tagOverride?: string) {
    const params: Record<string, string> = {};
    if (searchText.trim()) params.search = searchText.trim();
    if ((tagOverride ?? searchTag).trim()) params.tag = (tagOverride ?? searchTag).trim();
    if (searchAuthor) params.authorUserId = searchAuthor;
    if (searchMention) params.mentionedUserId = searchMention;
    if (searchFrom) params.from = searchFrom;
    if (searchTo) params.to = searchTo;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchHandovers(params));
    } catch {
      setError("A keresés nem sikerült. Ellenőrizd a dátumtartományt.");
    } finally {
      setLoading(false);
    }
  }

  function searchByTag(tag: string) {
    setSearchTag(tag);
    setMode("search");
    void runSearch(tag);
  }

  function openSearch() {
    setMode("search");
    void runSearch();
  }

  function openResult(post: HandoverPost) {
    pendingScrollId.current = `handover-post-${post.id}`;
    setDate(post.handoverDate);
    setMode("day");
  }

  function editorValue(content: string, mentions: HandoverPerson[]): EditorValue {
    return { content, mentionUserIds: mentions.map((mention) => mention.id) };
  }

  function renderTags(itemTags: string[]) {
    return itemTags.length > 0 ? (
      <div className="mt-1 flex max-w-full gap-1.5 overflow-x-auto">
        {itemTags.map((tag) => (
          <button key={tag} type="button" className="shrink-0 rounded-full bg-red/10 px-2 py-0.5 text-xs font-bold text-red hover:bg-red/20" onClick={() => searchByTag(tag)}>
            #{tag}
          </button>
        ))}
      </div>
    ) : null;
  }

  function renderPost(post: HandoverPost, readOnly = false, showAuthor = true) {
    const ownPost = post.author.id === user?.id;
    const canModifyPost = !readOnly && ownPost && post.handoverDate === currentDate;
    const postIsEditing = editingPost?.id === post.id;
    const repliesAreOpen = expandedReplies === post.id || replyingTo === post.id;
    const displayedPostContent = visibleMessage(post.content);
    const contentIsLong = displayedPostContent.length > 240 || displayedPostContent.split("\n").length > 3;
    const contentIsExpanded = expandedPosts.has(post.id);
    const lastReply = post.replies.at(-1);
    return (
      <article key={post.id} id={`handover-post-${post.id}`} className={`scroll-mt-24 border-b border-brown/10 px-2 pb-[0.3rem] pt-0 transition-colors last:border-b-0 sm:px-3 ${highlightedPostId === post.id ? "bg-red/10" : ""}`}>
        <div className="flex items-start gap-1.5">
          {showAuthor ? (
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brown text-[8px] font-black text-cream">
              {initials(post.author)}
            </div>
          ) : <div className="w-6 shrink-0 text-center text-brown/25">•</div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                {showAuthor ? <p className="truncate text-sm font-bold leading-5">{post.author.lastName} {post.author.firstName}</p> : null}
                <p className="text-[10px] leading-4 text-brown/50">{formatTime(post.createdAt)}{wasEdited(post.createdAt, post.updatedAt) ? " · szerkesztve" : ""}</p>
              </div>
              {canModifyPost ? (
                <details className="relative shrink-0">
                  <summary className="cursor-pointer list-none rounded px-2 py-0.5 text-lg font-bold leading-none hover:bg-cream" aria-label="Poszt műveletei">⋯</summary>
                  <div className="absolute right-0 z-10 mt-1 min-w-32 rounded-md border border-brown/10 bg-white p-1 shadow-xl">
                    <button type="button" className="block w-full rounded px-3 py-2 text-left text-xs font-bold hover:bg-cream" onClick={() => setEditingPost({ id: post.id, value: editorValue(post.content, post.mentions) })}>Szerkesztés</button>
                    <button type="button" className="block w-full rounded px-3 py-2 text-left text-xs font-bold text-red hover:bg-red/5" disabled={saving} onClick={() => void removePost(post)}>Törlés</button>
                  </div>
                </details>
              ) : null}
            </div>
            {postIsEditing && editingPost ? (
              <div className="mt-3 space-y-2">
                <HandoverEditor value={editingPost.value.content} mentionUserIds={editingPost.value.mentionUserIds} managers={managers} tags={tags} placeholder="Poszt szerkesztése" onChange={(content, mentionUserIds) => setEditingPost({ id: post.id, value: { content, mentionUserIds } })} />
                <div className="flex gap-2">
                  <Button disabled={saving} onClick={() => void savePost()}>Mentés</Button>
                  <Button variant="ghost" onClick={() => setEditingPost(null)}>Mégse</Button>
                </div>
              </div>
            ) : (
              <>
                <p className={`mt-0.5 whitespace-pre-wrap break-words text-lg leading-6 sm:text-xl sm:leading-7 ${contentIsLong && !contentIsExpanded ? "handover-clamped" : ""}`}>{renderMessage(post.content)}</p>
                {contentIsLong ? (
                  <button type="button" className="mt-1 text-xs font-bold text-red hover:underline" onClick={() => setExpandedPosts((current) => {
                    const next = new Set(current);
                    if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
                    return next;
                  })}>{contentIsExpanded ? "Kevesebb" : "Tovább"}</button>
                ) : null}
              </>
            )}
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-0.5">
              {renderTags(post.tags)}
              {replyingTo !== post.id ? (
                !readOnly ? (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs">
                    {post.replies.length > 0 ? (
                      <button type="button" className="font-bold text-brown/70 hover:text-red" onClick={() => setExpandedReplies(repliesAreOpen ? null : post.id)}>
                        ↳ {post.replies.length} válasz {repliesAreOpen ? "elrejtése" : "megnyitása"}{!repliesAreOpen && lastReply ? ` · utolsó: ${lastReply.author.lastName} ${lastReply.author.firstName}` : ""}
                      </button>
                    ) : null}
                    <button type="button" className="font-bold text-red hover:underline" onClick={() => { setExpandedReplies(post.id); setReplyingTo(post.id); }}>Válasz</button>
                  </div>
                ) : post.replies.length > 0 ? (
                  <button type="button" className="mt-1 text-xs font-bold text-brown/70 hover:text-red" onClick={() => setExpandedReplies(repliesAreOpen ? null : post.id)}>↳ {post.replies.length} válasz {repliesAreOpen ? "elrejtése" : "megnyitása"}</button>
                ) : null
              ) : null}
            </div>

            {repliesAreOpen && post.replies.length > 0 ? (
              <div className="mt-1.5 space-y-1.5 border-l-2 border-brown/10 pl-3">
                {post.replies.map((reply) => {
                  const ownReply = reply.author.id === user?.id;
                  const replyIsEditing = editingReply?.id === reply.id;
                  return (
                    <div key={reply.id} id={`handover-reply-${reply.id}`} className="scroll-mt-24 rounded-md bg-cream/45 px-3 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold">{reply.author.lastName} {reply.author.firstName}</p>
                          <p className="text-xs text-brown/55">{formatTime(reply.createdAt)}{wasEdited(reply.createdAt, reply.updatedAt) ? " · szerkesztve" : ""}</p>
                        </div>
                        {!readOnly && ownReply ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditingReply({ id: reply.id, value: editorValue(reply.content, reply.mentions) })}>Szerkesztés</Button>
                            <Button variant="ghost" className="px-2 py-1 text-xs text-red" disabled={saving} onClick={() => void removeReply(post.id, reply)}>Törlés</Button>
                          </div>
                        ) : null}
                      </div>
                      {replyIsEditing && editingReply ? (
                        <div className="mt-2 space-y-2">
                          <HandoverEditor value={editingReply.value.content} mentionUserIds={editingReply.value.mentionUserIds} managers={managers} tags={tags} placeholder="Válasz szerkesztése" maxLength={4000} onChange={(content, mentionUserIds) => setEditingReply({ id: reply.id, value: { content, mentionUserIds } })} />
                          <div className="flex gap-2">
                            <Button disabled={saving} onClick={() => void saveReply(post.id)}>Mentés</Button>
                            <Button variant="ghost" onClick={() => setEditingReply(null)}>Mégse</Button>
                          </div>
                        </div>
                      ) : <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{renderMessage(reply.content)}</p>}
                      {renderTags(reply.tags)}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {!readOnly && replyingTo === post.id ? (
              <div className="mt-1 space-y-2">
                <HandoverEditor autoFocus value={replyDrafts[post.id]?.content ?? ""} mentionUserIds={replyDrafts[post.id]?.mentionUserIds ?? []} managers={managers} tags={tags} placeholder="Írj választ…" maxLength={4000} onChange={(content, mentionUserIds) => setReplyDrafts((drafts) => ({ ...drafts, [post.id]: { content, mentionUserIds } }))} />
                <div className="flex gap-2">
                  <Button disabled={saving || !replyDrafts[post.id]?.content.trim()} onClick={() => void submitReply(post.id)}>Válasz küldése</Button>
                  <Button variant="ghost" onClick={() => setReplyingTo(null)}>Mégse</Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red">Manager kommunikáció</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Átadó</h1>
          <p className="mt-1 text-sm text-brown/65">A napi egység 06:00-tól másnap 06:00-ig tart.</p>
        </div>
        <div className="flex rounded-md bg-white p-1 shadow-soft">
          <button type="button" className={`rounded px-3 py-2 text-sm font-bold ${mode === "day" ? "bg-brown text-cream" : ""}`} onClick={() => setMode("day")}>Napi átadó</button>
          <button type="button" className={`rounded px-3 py-2 text-sm font-bold ${mode === "search" ? "bg-brown text-cream" : ""}`} onClick={openSearch}>Keresés</button>
        </div>
      </div>

      {error ? <Card className="border border-red/20 bg-red/5"><p className="font-semibold text-red">{error}</p></Card> : null}

      {mode === "day" ? (
        <>
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-2">
              <Button variant="ghost" aria-label="Előző nap" onClick={() => setDate(addDays(date, -1))}>←</Button>
              <Input label="Átadó napja" type="date" value={date} max={currentDate} onChange={(event) => setDate(event.target.value)} />
              <Button variant="ghost" aria-label="Következő nap" disabled={date >= currentDate} onClick={() => setDate(addDays(date, 1))}>→</Button>
            </div>
            <div className="sm:text-right">
              <p className="font-bold capitalize">{formatDay(date)}</p>
              {date !== currentDate ? <Button variant="ghost" className="mt-1 px-2 py-1" onClick={() => setDate(currentDate)}>Ugrás a mai átadóhoz</Button> : <p className="text-xs font-bold uppercase tracking-wide text-green">Aktuális átadó</p>}
            </div>
          </Card>

          {loading ? <p className="py-8 text-center font-semibold text-brown/60">Átadó betöltése…</p> : posts.length === 0 ? <Card className="py-10 text-center"><p className="font-bold">Ehhez a naphoz még nincs bejegyzés.</p><p className="mt-1 text-sm text-brown/60">{date === currentDate ? "Írd meg az első átadóposztot a + gombbal." : "Korábbi napra új poszt már nem írható."}</p></Card> : (
            <Card className="!p-0">
              {posts.map((post, index) => renderPost(post, false, index === 0 || posts[index - 1]?.author.id !== post.author.id))}
            </Card>
          )}
        </>
      ) : (
        <>
          <Card>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input label="Szöveges keresés" value={searchText} placeholder="Keresés posztban és válaszban" onChange={(event) => setSearchText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void runSearch(); }} />
              <Select label="Tag" value={searchTag} onChange={(event) => setSearchTag(event.target.value)} options={[{ value: "", label: "Összes tag" }, ...tags.map((tag) => ({ value: tag, label: `#${tag}` }))]} />
              <Select label="Szerző" value={searchAuthor} onChange={(event) => setSearchAuthor(event.target.value)} options={[{ value: "", label: "Bármely manager" }, ...managers.map((manager) => ({ value: manager.id, label: `${manager.lastName} ${manager.firstName}` }))]} />
              <Select label="Megjelölt manager" value={searchMention} onChange={(event) => setSearchMention(event.target.value)} options={[{ value: "", label: "Bármely manager" }, ...managers.map((manager) => ({ value: manager.id, label: `${manager.lastName} ${manager.firstName}` }))]} />
              <Input label="Ettől a naptól" type="date" value={searchFrom} max={currentDate} onChange={(event) => setSearchFrom(event.target.value)} />
              <Input label="Eddig a napig" type="date" value={searchTo} max={currentDate} onChange={(event) => setSearchTo(event.target.value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void runSearch()}>Keresés</Button>
              <Button variant="ghost" onClick={() => { setSearchText(""); setSearchTag(""); setSearchAuthor(""); setSearchMention(""); setSearchFrom(""); setSearchTo(""); }}>Szűrők törlése</Button>
            </div>
          </Card>

          {loading ? <p className="py-8 text-center font-semibold text-brown/60">Keresés…</p> : (
            <div className="space-y-4">
              <p className="text-sm font-bold">{results.length} találat</p>
              {results.length === 0 ? <Card className="py-10 text-center"><p className="font-bold">Nincs a szűrésnek megfelelő bejegyzés.</p></Card> : results.map((post) => (
                <div key={post.id}>
                  <button type="button" className="mb-1 text-sm font-bold capitalize text-red hover:underline" onClick={() => openResult(post)}>{formatDay(post.handoverDate)} → napi átadó megnyitása</button>
                  <Card className="!p-0">{renderPost(post, true)}</Card>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {mode === "day" && posts.length > 2 ? (
        <button
          type="button"
          title="Ugrás a legújabb poszthoz"
          aria-label="Ugrás a legújabb poszthoz"
          className={`fixed right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-brown/10 bg-white text-lg font-black text-brown shadow-xl transition hover:bg-cream md:right-8 ${date === currentDate ? "bottom-40 md:bottom-24" : "bottom-24 md:bottom-8"}`}
          onClick={() => document.getElementById(`handover-post-${posts.at(-1)?.id ?? ""}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        >
          ↓
        </button>
      ) : null}

      {mode === "day" && date === currentDate ? (
        <button
          type="button"
          title="Új átadóposzt"
          aria-label="Új átadóposzt"
          className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-red text-3xl font-light text-white shadow-xl transition hover:scale-105 hover:bg-brown md:bottom-8 md:right-8"
          onClick={() => setComposerOpen(true)}
        >
          +
        </button>
      ) : null}

      {composerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="handover-composer-title">
          <button type="button" aria-label="Új poszt ablak bezárása" className="absolute inset-0 bg-brown/40" onClick={() => setComposerOpen(false)} />
          <div className="relative z-10 w-full rounded-t-xl bg-white p-4 shadow-2xl sm:max-w-2xl sm:rounded-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="handover-composer-title" className="text-lg font-black">Új átadóposzt</h2>
                <p className="text-xs capitalize text-brown/55">{formatDay(date)}</p>
              </div>
              <button type="button" className="rounded px-3 py-2 text-sm font-bold hover:bg-cream" onClick={() => setComposerOpen(false)}>Bezárás</button>
            </div>
            <HandoverEditor autoFocus value={newPost.content} mentionUserIds={newPost.mentionUserIds} managers={managers} tags={tags} placeholder="Mi történt, amiről a következő managernek tudnia kell?" onChange={(content, mentionUserIds) => setNewPost({ content, mentionUserIds })} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setComposerOpen(false)}>Mégse</Button>
              <Button disabled={saving || !newPost.content.trim()} onClick={() => void submitPost()}>Közzététel</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
