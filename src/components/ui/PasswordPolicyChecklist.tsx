import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/utils/password";

/**
 * パスワード入力欄の下に表示するリアルタイムポリシーチェックリスト。
 * 入力中のパスワードが各ルールを満たしているかを視覚的に示す。
 */
export function PasswordPolicyChecklist({ password }: { password: string }) {
  return (
    <ul className="space-y-0.5 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.key}
            className={ok ? "flex items-center gap-1 text-green-600" : "flex items-center gap-1 text-muted-foreground"}
          >
            {ok ? <Check className="size-3" /> : <X className="size-3" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
