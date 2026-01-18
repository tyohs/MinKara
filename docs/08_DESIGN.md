# 08. デザインガイドライン

## 8.1 デザインコンセプト

MinKaraは**「演奏の瞬間を際立たせる」**ためのコントラスト設計を採用。

### デュアルモード設計

| モード | 適用場面 | 方針 |
|--------|----------|------|
| **Calm Mode** | ロビー、曲選択、待機中 | 落ち着いたUI、操作性重視 |
| **Live Mode** | 演奏中、リザルト | 派手なエフェクト、盛り上がり演出 |

> **設計意図**: 普段のUIは控えめにし、演奏開始時のギャップで盛り上がりを演出する。

### 絵文字の使用禁止

| ルール | 理由 |
|--------|------|
| **絵文字（Emoji）は使用禁止** | AIっぽさ・安っぽさを避けるため |
| **代替手段** | Lucide Reactアイコン、SVGアイコン、CSSで作成したシェイプ |

> **注意**: 楽器の表示は絵文字ではなく、SVGアイコンまたはLucide Reactのアイコンを使用すること。

---

## 8.2 画面別モード適用

| 画面 | モード | 理由 |
|------|--------|------|
| ホーム | Calm | 導入、落ち着いた印象 |
| ルーム作成/参加 | Calm | 入力フォーム中心 |
| デンモク（曲選択） | Calm | 情報確認・操作が多い |
| 役割選択 | Calm | 選択UI |
| **シンガー画面** | **Live** | 歌詞表示でテンション↑ |
| **バンド画面** | **Live** | リズムゲーム本番 |
| **お邪魔画面** | **Live** | ゲーム参加中 |
| **リザルト画面** | **Live** | 盛り上がりのクライマックス |

---

## 8.3 カラーパレット

### 基本カラー（ブルー〜シアン系）

| 用途 | 色名 | Hex | 使用箇所 |
|------|------|-----|----------|
| **Primary** | ディープブルー | `#1e3a5f` | メインUI、ボタン |
| **Accent** | シアン | `#06b6d4` | ハイライト、リンク |
| **Background** | ダークネイビー | `#0f172a` | 背景 |
| **Surface** | ダークブルー | `#1e293b` | カード、パネル |

### 状態カラー

| 用途 | Hex | 使用箇所 |
|------|-----|----------|
| **Success** | `#22c55e` | PERFECT判定、成功 |
| **Warning** | `#f59e0b` | GOOD判定、警告 |
| **Error** | `#ef4444` | MISS判定、エラー |
| **Info** | `#38bdf8` | ヒント、情報 |

### Live Mode 追加カラー

| 用途 | Hex | 使用箇所 |
|------|-----|----------|
| **Accent Bright** | `#22d3ee` | 演奏中のアクセント |
| **Glow** | `#06b6d4` | ネオングロー効果 |

---

## 8.4 Calm Mode スタイル

### 原則
- ❌ グラデーション不使用
- ❌ グロー効果不使用
- ❌ Glassmorphism（backdrop-blur）不使用
- ✅ ソリッドカラー
- ✅ 最小限のアニメーション

### カードスタイル

```html
<div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
  <!-- Content -->
</div>
```

### ボタンスタイル

```html
<!-- Primary -->
<button class="
  bg-primary hover:bg-primary/80
  text-white font-semibold
  px-6 py-3 rounded-lg
  transition-colors duration-200
">
  ボタン
</button>

<!-- Secondary -->
<button class="
  bg-slate-700 hover:bg-slate-600
  text-white font-semibold
  px-6 py-3 rounded-lg
  border border-slate-600
  transition-colors duration-200
">
  ボタン
</button>
```

### アニメーション（最小限）

```typescript
// フェードインのみ
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.2 }}
>
```

---

## 8.5 Live Mode スタイル

### 原則
- ✅ グラデーション使用可
- ✅ グロー効果使用可
- ✅ Glassmorphism使用可
- ✅ 派手なアニメーション推奨
- ✅ 紙吹雪・エフェクト使用可

### Glassmorphism カード

```html
<div class="
  bg-primary/60 backdrop-blur-md
  border border-white/20 rounded-2xl
  shadow-lg p-6
">
  <!-- Content -->
</div>
```

### ネオングロー効果

```css
.neon-glow {
  text-shadow: 0 0 10px #06b6d4,
               0 0 20px #06b6d4,
               0 0 30px #06b6d4;
}

.button-glow:hover {
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.6),
              0 0 40px rgba(6, 182, 212, 0.4);
}
```

### 判定エフェクト

```typescript
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: [0, 1.2, 1] }}
  transition={{ duration: 0.4, ease: "easeOut" }}
  className="text-4xl font-bold neon-glow text-success"
>
  ⭐ PERFECT! ⭐
</motion.div>
```

### スケールアニメーション

```typescript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
```

---

## 8.6 タイポグラフィ

### フォントファミリー

| 用途 | フォント | Fallback |
|------|---------|----------|
| **見出し** | Inter | Noto Sans JP, sans-serif |
| **本文** | Noto Sans JP | sans-serif |
| **数字（スコア）** | JetBrains Mono | monospace |

### フォントサイズ

| 要素 | サイズ | 用途 |
|------|--------|------|
| **H1** | 2.5rem (40px) | ページタイトル |
| **H2** | 2rem (32px) | セクション |
| **H3** | 1.5rem (24px) | サブセクション |
| **Body** | 1rem (16px) | 本文 |
| **Caption** | 0.875rem (14px) | 補足テキスト |
| **Score** | 3rem (48px) | スコア表示 |

### Tailwind ユーティリティ

- 見出し: `text-balance`
- 本文: `text-pretty`
- 数値: `tabular-nums`
- 長文: `truncate` または `line-clamp-*`

---

## 8.7 レイアウト

### レスポンシブブレークポイント

| ブレークポイント | 幅 | デバイス |
|----------------|-----|---------|
| **sm** | 640px | スマホ（横） |
| **md** | 768px | タブレット |
| **lg** | 1024px | ラップトップ |
| **xl** | 1280px | デスクトップ |

### スペーシング（4px単位）

| 名前 | サイズ | 用途 |
|------|--------|------|
| **xs** | 4px | 最小マージン |
| **sm** | 8px | 要素間の小さな間隔 |
| **md** | 16px | 標準間隔 |
| **lg** | 24px | セクション間 |
| **xl** | 32px | 大きなセクション間 |

### Z-Index スケール（固定）

| 名前 | 値 | 用途 |
|------|-----|------|
| base | 0 | 通常要素 |
| dropdown | 10 | ドロップダウン |
| sticky | 20 | スティッキー要素 |
| modal | 30 | モーダル |
| toast | 40 | トースト通知 |

---

## 8.8 アイコン

### アイコンライブラリ
- **Lucide React** を推奨

### サイズ

| サイズ | px | 用途 |
|--------|-----|------|
| **Small** | 16px | インラインアイコン |
| **Medium** | 24px | ボタンアイコン |
| **Large** | 32px | ヘッダーアイコン |
| **XL** | 48px | 役割選択アイコン |

### アクセシビリティ
- アイコンのみのボタンには `aria-label` 必須

---

## 8.9 アクセシビリティ

### 必須対応
- キーボード操作対応（フォーカス管理）
- `aria-label` の適切な設定
- 十分なカラーコントラスト
- `prefers-reduced-motion` の尊重

### 推奨コンポーネント
- Base UI / React Aria / Radix の使用を推奨
- キーボード・フォーカス動作を手動実装しない

---

## 次へ

👉 [技術スタック](./09_TECH_STACK.md)で使用技術の詳細を確認
