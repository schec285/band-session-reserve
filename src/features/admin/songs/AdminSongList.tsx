"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  function fieldError(field: string) {
    return errors.find((e) => e.field === field)?.message;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    const res = await fetch("/api/admin/songs", {
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
        <div className="space-y-2">
          {songs.map((song) => (
            <div key={song.id} className="flex items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{song.title}</p>
                <p className="text-xs text-muted-foreground">{song.artist}</p>
              </div>
            </div>
          ))}
        </div>
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
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              required
            />
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
