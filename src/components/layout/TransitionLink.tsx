"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { usePageNavigate } from "./PageTransition";

type Props = ComponentProps<typeof Link>;

/**
 * 押下後にコンテンツ領域を中央スピナー表示へ置き換えて遷移する Link。
 * PageTransitionProvider の内側でのみ使用する。
 */
export function TransitionLink({ href, onClick, ...props }: Props) {
  const navigate = usePageNavigate();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    e.preventDefault();
    navigate(href.toString());
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}
