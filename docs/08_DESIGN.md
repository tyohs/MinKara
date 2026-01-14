# 08. デザインガイドライン

## 8.1 デザインコンセプト

MinKaraは**「音に乗る」体験**を視覚的にも表現します。

### キーワード
- **Glassmorphism**: 磨りガラス風の半透明デザイン
- **ネオン風アクセント**: 寒色系のグロー効果
- **ダークモード**: 目に優しい暗い背景
- **マイクロアニメーション**: 滑らかな動き

---

## 8.2 カラーパレット

### 基本カラー（寒色系）

| 用途 | 色名 | Hex | RGB | 使用箇所 |
|------|------|-----|-----|---------|
| **Primary** | ディープブルー | `#1e3a5f` | rgb(30, 58, 95) | メインUI、ボタン |
| **Secondary** | エレクトリックパープル | `#7c3aed` | rgb(124, 58, 237) | アクセント、強調 |
| **Accent** | サイバーシアン | `#06b6d4` | rgb(6, 182, 212) | ハイライト、リンク |
| **Background** | ダークネイビー | `#0f172a` | rgb(15, 23, 42) | 背景 |
| **Surface** | グラスモーフィズム | `rgba(30, 58, 95, 0.6)` | - | カード、パネル |

### 状態カラー

| 用途 | 色名 | Hex | 使用箇所 |
|------|------|-----|---------|
| **Success** | ネオングリーン | `#22c55e` | PERFECT判定、成功 |
| **Warning** | アンバー | `#f59e0b` | GOOD判定、警告 |
| **Error** | コーラルレッド | `#ef4444` | MISS判定、エラー |
| **Info** | スカイブルー | `#38bdf8` | ヒント、情報 |

---

## 8.3 タイポグラフィ

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

---

## 8.4 Glassmorphismスタイル

### 基本スタイル

```css
.glass-card {
  background: rgba(30, 58, 95, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}
```

### Tailwind CSS版

```html
<div class="bg-primary/60 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg">
  <!-- Content -->
</div>
```

---

## 8.5 グロー効果

### ネオン風グロー

```css
.neon-glow {
  text-shadow: 0 0 10px #06b6d4,
               0 0 20px #06b6d4,
               0 0 30px #06b6d4;
}

.button-glow:hover {
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.6),
              0 0 40px rgba(124, 58, 237, 0.4);
}
```

---

## 8.6 アニメーション

### マイクロアニメーション（Framer Motion）

#### フェードイン
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
```

#### スケール（ボタン押下）
```typescript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
```

#### 判定エフェクト
```typescript
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: [0, 1.2, 1] }}
  transition={{ duration: 0.4, ease: "easeOut" }}
>
  PERFECT!
</motion.div>
```

---

## 8.7 レイアウト

### グリッドシステム
- **12カラムグリッド**を基本とする
- Tailwind CSSのグリッドユーティリティを使用

### レスポンシブブレークポイント

| ブレークポイント | 幅 | デバイス |
|----------------|-----|---------|
| **sm** | 640px | スマホ（横） |
| **md** | 768px | タブレット |
| **lg** | 1024px | ラップトップ |
| **xl** | 1280px | デスクトップ |

---

## 8.8 ボタンスタイル

### プライマリボタン

```html
<button class="
  bg-secondary hover:bg-secondary/80
  text-white font-semibold
  px-6 py-3 rounded-lg
  shadow-lg hover:shadow-xl
  transition-all duration-200
  backdrop-blur-sm
">
  ボタン
</button>
```

### セカンダリボタン

```html
<button class="
  bg-primary/40 hover:bg-primary/60
  text-white font-semibold
  px-6 py-3 rounded-lg
  border border-white/20
  backdrop-blur-md
  transition-all duration-200
">
  ボタン
</button>
```

---

## 8.9 アイコン

### アイコンライブラリ
- **Lucide React**を推奨
- または**Heroicons**

### サイズ

| サイズ | px | 用途 |
|--------|-----|------|
| **Small** | 16px | インラインアイコン |
| **Medium** | 24px | ボタンアイコン |
| **Large** | 32px | ヘッダーアイコン |
| **XL** | 48px | 役割選択アイコン |

---

## 8.10 グラデーション

### 背景グラデーション

```css
.bg-gradient {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
}
```

### ボタングラデーション

```css
.btn-gradient {
  background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
}
```

---

## 8.11 スペーシング

### 基本単位
- **4px単位**を基本とする（Tailwind CSS標準）

### 主要スペーシング

| 名前 | サイズ | 用途 |
|------|--------|------|
| **xs** | 4px | 最小マージン |
| **sm** | 8px | 要素間の小さな間隔 |
| **md** | 16px | 標準間隔 |
| **lg** | 24px | セクション間 |
| **xl** | 32px | 大きなセクション間 |

---

## 8.12 UI要素の例

### カード

```html
<div class="glass-card p-6 space-y-4">
  <h3 class="text-2xl font-bold text-white">タイトル</h3>
  <p class="text-gray-300">説明文</p>
</div>
```

### 判定表示

```html
<motion.div
  className="
    text-4xl font-bold
    neon-glow
    text-success
  "
>
  ⭐ PERFECT! ⭐
</motion.div>
```

---

## 次へ

👉 [技術スタック](./09_TECH_STACK.md)で使用技術の詳細を確認
