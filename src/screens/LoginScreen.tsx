import { useState } from "react";

type Props = {
  onLogin: (password: string) => Promise<void>;
};

export function LoginScreen({ onLogin }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onLogin(password);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-box">
        <p className="login-label">株式会社プゥル・ヴー</p>
        <h1 className="login-title">ホワイト事業部価格表</h1>
        <p className="login-subtitle">社内用パスワードを入力してください</p>

        <label className="login-field">
          <span className="login-field-label">パスワード</span>
          <input
            type="password"
            className="login-input"
            placeholder="パスワードを入力"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
            }}
            autoComplete="current-password"
            autoFocus
          />
        </label>

        <button
          type="button"
          className="login-btn"
          disabled={busy || !password.trim()}
          onClick={() => void handleSubmit()}
        >
          {busy ? "ログイン中…" : "ログイン"}
        </button>

        {error && <p className="login-error">{error}</p>}

        <p className="login-note">
          ログイン後にのみ、客先別単価などの本番データを表示します。
        </p>
      </div>
    </div>
  );
}
