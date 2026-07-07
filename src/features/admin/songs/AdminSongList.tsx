"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchWithCsrf } from "@/lib/client/fetchWithCsrf";
import { ArtistSongAccordion } from "./ArtistSongAccordion";

interface Song {
  id: string;
  title: string;
  artist: string;
}

interface Props {
  songs: Song[];
}

/**
 * 曲マスタ一覧と新規追加フォームを表示するコンポーネント。
 */
export function AdminSongList({ songs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // アーティスト入力の候補ドロップダウンを表示するかどうか。入力欄からフォーカスが外れたら閉じる。
  const [artistSearchOpen, setArtistSearchOpen] = useState(false);

  // 曲マスタ上のアーティスト名を重複排除した候補一覧。songs はアーティスト昇順のため追加ソート不要。
  const artistCandidates = useMemo(() => Array.from(new Set(songs.map((s) => s.artist))), [songs]);

  // 入力中のアーティスト名で部分一致（大文字小文字を区別しない）する候補を最大10件返す。
  const artistSearchResults = useMemo(() => {
    const query = artist.trim().toLowerCase();
    const matched =
      query === "" ? artistCandidates : artistCandidates.filter((a) => a.toLowerCase().includes(query));
    return matched.slice(0, 10);
  }, [artistCandidates, artist]);

  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    const res = await fetchWithCsrf("/api/admin/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, artist }),
    });

    setSubmitting(false);

    if (res.ok) {
      setTitle("");
      setArtist("");
      startTransition(() => router.refresh());
    } else {
      const json = await res.json();
      setErrors(json.errors ?? [{ field: "", message: json.message }]);
    }
  }

  return (
    <div className="space-y-8">
      {/* 曲一覧 */}
      {songs.length === 0 ? (
        <p className="text-muted-foreground text-sm">曲が登録されていません。</p>
      ) : (
        <ArtistSongAccordion songs={songs} />
      )}

      {/* 新規追加フォーム */}
      <div className="border rounded-lg p-4">
        <h2 className="font-medium mb-4">曲を追加する</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-1">
            <Label htmlFor="title">曲名</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            {fieldError("title") && (
              <p className="text-destructive text-sm">{fieldError("title")}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="artist">アーティスト</Label>
            <div
              className="relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setArtistSearchOpen(false);
                }
              }}
            >
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                onFocus={() => setArtistSearchOpen(true)}
                onClick={() => setArtistSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setArtistSearchOpen(false);
                }}
                required
              />
              {artistSearchOpen && artistSearchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-background shadow-lg divide-y">
                  {artistSearchResults.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => {
                        setArtist(candidate);
                        setArtistSearchOpen(false);
                      }}
                      className="w-full text-left p-2 text-sm hover:bg-muted"
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {fieldError("artist") && (
              <p className="text-destructive text-sm">{fieldError("artist")}</p>
            )}
          </div>

          {fieldError("") && (
            <p className="text-destructive text-sm">{fieldError("")}</p>
          )}

          <Button type="submit" disabled={submitting || isPending}>
            {submitting || isPending ? "追加中..." : "追加する"}
          </Button>
        </form>
      </div>
    </div>
  );
}
