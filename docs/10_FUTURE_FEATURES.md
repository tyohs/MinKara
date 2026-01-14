# 10. 将来の拡張機能（オプション）

> [!NOTE]
> **このドキュメントは基本実装完成後の追加検討項目です。**  
> MVP（Minimum Viable Product）には含めず、余裕があれば段階的に実装する機能として位置づけます。

---

## 10.1 ランダム要素の追加

### 現状
- デンモク画面で「ルーレット」ボタン
- 全参加者からランダム選出
- 当選者が次の曲のシンガーに

### 拡張案A: 罰ゲーム風ルーレット
- 予約時に「ルーレット予約」オプション
- 曲開始時にルーレット演出
- **拒否不可**で盛り上がる

### 拡張案B: オプトイン式ルーレット
- 「ルーレット参加」ボタンで参加意思表明
- 強制されないので心理的ハードルが低い

### 拡張案C: 重み付きルーレット
- 最近歌っていない人ほど当たりやすい
- 公平性を保ちつつランダム性も確保

```typescript
// 重み付き計算例
function getWeightedRandom(participants: Participant[]) {
  const weights = participants.map(p => {
    const lastSangAt = getLastSang(p.id);
    const timeSince = Date.now() - lastSangAt;
    return timeSince / 60000; // 分単位で重み付け
  });
  // 重みに基づいてランダム選出
}
```

**推奨**: 拡張案A + C の組み合わせ

---

## 10.2 ノーツ生成の高度化

### 現状（MVP）
- BPM自動生成
- 拍に合わせて均等配置

### 拡張案A: ビート検出 + 自動生成
```typescript
// Web Audio APIでビート検出
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const dataArray = new Uint8Array(analyser.frequencyBinCount);

function detectBeats() {
  analyser.getByteFrequencyData(dataArray);
  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  if (average > threshold) {
    // ビート検出 → ノーツ配置
  }
}
```

### 拡張案B: ハイブリッド方式
- BPMベースの基本配置
- 手動でハイライト部分（サビなど）を調整
- **JSONで譜面データを管理**

```json
{
  "songId": "song-001",
  "bpm": 120,
  "notes": [
    { "time": 0, "lane": 0, "type": "normal" },
    { "time": 500, "lane": 2, "type": "special" }
  ],
  "manualAdjustments": [
    { 
      "startTime": 60000, 
      "endTime": 90000, 
      "density": 2.0,
      "comment": "サビ部分"
    }
  ]
}
```

### 拡張案C: 難易度別自動生成
| 難易度 | ノーツ密度 | 同時押し |
|--------|-----------|---------|
| Easy | 4分音符のみ | なし |
| Normal | 8分音符まで | 2つまで |
| Hard | 16分音符まで | 3つ以上 |

---

## 10.3 スコアシステムの拡張

### MVP案（基本仕様）
```typescript
// バンドのみスコア
score = basePoint × (1 + combo/100);
```

### 拡張案A: 役割別スコア

| 役割 | スコア基準 |
|------|-----------|
| **バンド** | リズム判定 × コンボ |
| **お邪魔** | お邪魔成功回数 × 100点 |
| **シンガー** | 曲完走 + 歌唱評価（将来） |

### 拡張案B: チームスコア方式
```typescript
// 個人 + チーム総合
interface Result {
  individual: Score[];      // 個人スコア
  teamTotal: number;        // 総合スコア
  targetScore: number;      // 目標スコア
  achieved: boolean;        // 達成判定
}
```

- 目標スコア達成で特別演出
- 「みんなで達成した」感を演出

### 拡張案C: お邪魔ペナルティ方式
- お邪魔を受けた側がMISSするとお邪魔側にボーナス
- 対抗心が生まれてゲーム性UP

```typescript
// お邪魔ボーナス計算
if (judgment === 'miss' && hasOjama) {
  ojamaPlayer.score += 200; // ボーナス
}
```

---

## 10.4 お邪魔防御機能

### MVP案（基本仕様）
- **防御手段なし**
- お邪魔は完全に通る
- パーティゲームのカオス感重視

### 拡張案A: シールド機能
```typescript
// コンボ数でシールド獲得
if (combo >= 50) {
  gainShield(); // 1回無効化
}
```

- バンドのコンボが一定数に達すると獲得
- シールドがあるとお邪魔を1回無効化
- 消費制なので無限防御にはならない

### 拡張案B: 反撃機能
- お邪魔を受けた直後に特定入力で**反射**
- 反射に成功するとお邪魔役に跳ね返る
- タイミングシビアでスキル要素

```typescript
// 反撃判定
if (ojama && perfectTiming()) {
  reflectOjama(ojamaPlayer);
}
```

### 拡張案C: お邪魔予告
- お邪魔発動の**2〜3秒前に警告表示**
- 心の準備ができる（完全防御ではない）
- 緊張感の演出

```typescript
// 予告表示
showWarning("⚠️ お邪魔が来ます！", 2000);
setTimeout(() => executeOjama(), 2000);
```

### 拡張案D: お邪魔軽減
- 高スコアプレイヤーはお邪魔の**効果時間が短縮**
- 上手い人ほど守られる

```typescript
// 効果時間の調整
const duration = baseDuration * (1 - score/maxScore * 0.5);
```

**推奨**: 拡張案C（お邪魔予告）– バランスが良い

---

## 10.5 その他の拡張機能

### 歌唱評価（シンガー向け）
- マイク入力で音程検出
- Web Audio APIで周波数分析
- 音程バー表示

### デュエット曲対応
- 2人同時にシンガー
- パート分け表示
- 協力スコア

### MV背景
- MP4アップロードで背景表示
- オーディオと自動同期
- `opacity: 50%`で視認性確保

### カスタムコール
- バンド・お邪魔が応援メッセージ送信
- ニコニコ動画風に流れる
- シンガー画面に表示

---

## 実装優先度

| 優先度 | 機能 | 理由 |
|--------|------|------|
| **HIGH** | 重み付きルーレット | 盛り上がり要素 |
| **HIGH** | ハイブリッド譜面生成 | 曲の質向上 |
| **MEDIUM** | チームスコア | 協力感UP |
| **MEDIUM** | お邪魔予告 | バランス調整 |
| **LOW** | 歌唱評価 | 実装コスト高 |
| **LOW** | デュエット | スコープ大 |

---

## 次へ

👉 [Three.js連動機能](./11_THREE_JS_INTEGRATION.md)でさらに発展的な機能を確認
