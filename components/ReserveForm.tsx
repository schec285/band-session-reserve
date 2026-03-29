"use client";

import { useState } from "react";
import type { ReservationForm, FormErrors, ApiResponse } from "@/types/reservation";
import { PART_LABELS } from "@/types/reservation";

// フォームの初期値
const initialForm: ReservationForm = {
  name: "",
  date: "",
  songTitle: "",
  part: "guitar",
  comment: "",
};

// バリデーション関数
function validate(form: ReservationForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "名前を入力してください";
  }

  if (!form.date) {
    errors.date = "日付を選択してください";
  } else {
    // 過去の日付はNG
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(form.date) < today) {
      errors.date = "今日以降の日付を選択してください";
    }
  }

  if (!form.songTitle.trim()) {
    errors.songTitle = "曲名を入力してください";
  }

  if (!form.part) {
    errors.part = "パートを選択してください";
  }

  return errors;
}

export default function ReserveForm() {
  const [form, setForm] = useState<ReservationForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  // 入力ハンドラー（共通）
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // 入力したらそのフィールドのエラーをクリア
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  // 送信ハンドラー
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // バリデーション実行
    const newErrors = validate(form);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data: ApiResponse = await res.json();
      setResult(data);

      // 成功したらフォームをリセット
      if (data.success) {
        setForm(initialForm);
        setErrors({});
      }
    } catch {
      setResult({
        success: false,
        message: "通信エラーが発生しました。もう一度お試しください。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // 今日の日付（input[type=date]のmin値用）
  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* 成功 / エラーメッセージ */}
      {result && (
        <div className={`alert ${result.success ? "alert-success" : "alert-error"}`}>
          <span className="alert-icon">{result.success ? "✓" : "✕"}</span>
          <span>{result.message}</span>
        </div>
      )}

      <div className="form-card">
        {/* 名前 */}
        <div className="form-group">
          <label htmlFor="name" className="form-label form-label-required">
            名前
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className={`form-input ${errors.name ? "error" : ""}`}
            value={form.name}
            onChange={handleChange}
            placeholder="山田 太郎"
            autoComplete="name"
          />
          {errors.name && (
            <p className="form-error">
              <span>⚠</span> {errors.name}
            </p>
          )}
        </div>

        {/* 日付 */}
        <div className="form-group">
          <label htmlFor="date" className="form-label form-label-required">
            日付
          </label>
          <input
            id="date"
            name="date"
            type="date"
            className={`form-input ${errors.date ? "error" : ""}`}
            value={form.date}
            onChange={handleChange}
            min={today}
          />
          {errors.date && (
            <p className="form-error">
              <span>⚠</span> {errors.date}
            </p>
          )}
        </div>

        {/* 曲名 */}
        <div className="form-group">
          <label htmlFor="songTitle" className="form-label form-label-required">
            曲名
          </label>
          <input
            id="songTitle"
            name="songTitle"
            type="text"
            className={`form-input ${errors.songTitle ? "error" : ""}`}
            value={form.songTitle}
            onChange={handleChange}
            placeholder="例：Don't Stop Believin'"
          />
          {errors.songTitle && (
            <p className="form-error">
              <span>⚠</span> {errors.songTitle}
            </p>
          )}
        </div>

        {/* パート */}
        <div className="form-group">
          <label htmlFor="part" className="form-label form-label-required">
            パート
          </label>
          <select
            id="part"
            name="part"
            className={`form-select ${errors.part ? "error" : ""}`}
            value={form.part}
            onChange={handleChange}
          >
            {(Object.entries(PART_LABELS) as [keyof typeof PART_LABELS, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
          {errors.part && (
            <p className="form-error">
              <span>⚠</span> {errors.part}
            </p>
          )}
        </div>

        {/* コメント（任意） */}
        <div className="form-group">
          <label htmlFor="comment" className="form-label">
            コメント
          </label>
          <textarea
            id="comment"
            name="comment"
            className="form-textarea"
            value={form.comment}
            onChange={handleChange}
            placeholder="何かあれば自由に書いてください（任意）"
            rows={3}
          />
          <p className="form-hint">任意入力です</p>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          className="btn-primary form-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" />
              <span>送信中...</span>
            </>
          ) : (
            <>
              <span>予約を送信する</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
