# 🎤 みんカラ - みんなで作る、みんなのカラオケ

**「音に乗ることを重視」** したカラオケ体験アプリ。全員が主役になれる新感覚Web アプリケーション。

---

## ✨ 特徴

### 🎭 3つの役割
- **🎤 シンガー**: 曲を予約した人が歌う。歌詞表示で快適に歌唱
- **🎸 バンド**: リズムゲームで参加（ドラム/ギター/キーボード）
- **👻 お邪魔**: 他プレイヤーを妨害する専用役割

### 📡 リアルタイム連携
- Supabase Realtimeでスコア・状態を同期
- 全員が同じゲーム進行を共有

### 🎮 音に乗るゲーム性
- リズムゲームでポイント獲得
- お邪魔でカオスを演出
- 身内ランキングで盛り上がる


## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **フレームワーク** | Next.js 16 (App Router) |
| **言語** | TypeScript 5 |
| **UI** | React 19 |
| **スタイリング** | Tailwind CSS 4 |
| **アニメーション** | Framer Motion |
| **状態管理** | Zustand |
| **リアルタイム通信** | Supabase Realtime (WebSocket) |
| **バックエンド** | Supabase (Postgres + Realtime) |
| **音声再生** | Web Audio API |
| **ID生成** | Web Crypto API (`crypto.randomUUID`) |

---

## 🎯 ターゲット

- 普段カラオケを利用する学生層～ファミリー層
- 3〜10人程度の身内パーティー

## ローカル開発

Node.js 22を推奨します。

```bash
cp .env.example .env.local
npm ci
npm run dev
```

`.env.local`にはSupabase Project SettingsのURLとanon keyを設定します。service role keyはブラウザ向け環境変数に設定しないでください。

## 品質チェック

```bash
npm run check
```

lint、型検査、単体テスト、production buildを順に実行します。CIでも同じ境界を検証します。

## 同期とデータ整合性

- ブラウザ利用者IDは`localStorage`の`minkaraUserId`に一本化しています。
- ホスト権限はZustandの一時状態ではなく、`rooms.host_id`と利用者IDの一致から導出します。
- `supabase/migrations`のunique indexにより、1ルームにつき進行中セッションを1件に制限します。既存DBへ適用する前にSQL内のpreflight queryを実行してください。
- `supabase/policies/README.md`にRLS導入前の設計TODOを記録しています。再帰的なpolicy評価を避けるhelper設計とAnonymous Sign-InsへのID移行が完了するまで、実行可能なRLS SQLは追加しません。

## 現在のセキュリティ境界

現状の利用者IDはブラウザ生成値であり、本人性を証明する認証ではありません。公開運用前にSupabase Anonymous Sign-Insへ移行し、RLSを有効化する必要があります。秘密値や`.env.local`はコミットしないでください。

---
