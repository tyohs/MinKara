# 11. Three.js & リアル連動機能（将来構想）

> [!NOTE]
> **このドキュメントは基本実装完成後の発展的機能です。**  
> 技育博などのデモで差別化したい場合に段階的に実装を検討します。

---

## 11.1 新役割：ダンサー

### 概要
- **カメラでポーズ認識**してリズムに合わせた動きを評価
- MediaPipe / TensorFlow.jsでリアルタイム骨格検出
- Three.jsで3Dアバターを表示し、ユーザーの動きを反映

### 仕様

| 項目 | 内容 |
|------|------|
| **入力** | Webカメラ（スマホ/PC） |
| **検出技術** | MediaPipe Pose / TensorFlow.js PoseNet |
| **評価基準** | リズムに合わせた動き、特定ポーズの認識 |
| **スコアリング** | BPMタイミングで動きの大きさ・正確性を評価 |
| **3D表示** | React Three FiberでアバターをThree.js空間に配置 |

### 検出するアクション

| アクション | 検出方法 | タイミング |
|-----------|---------|-----------|
| **ジャンプ** | 全身の上下移動 | ビート強拍 |
| **手を上げる** | 両手の高さ検出 | サビ部分 |
| **ターン** | 肩の角度変化 | 間奏 |
| **決めポーズ** | 特定の骨格パターン | 曲の終わり |

### 実装例
```typescript
import { Pose } from '@mediapipe/pose';

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file }`;
  }
});

pose.onResults((results) => {
  const landmarks = results.poseLandmarks;
  // ジャンプ検出
  if (landmarks[0].y < threshold) {
    onJump();
  }
});
```

---

## 11.2 拡張機能：3Dペンライト（ジャイロセンサー）

### 概要
- スマホの**ジャイロセンサー**で振り方を検出
- Three.jsで**3D空間にペンライト**を表示
- 全員のペンライトが集まる**バーチャルライブ会場**

### 仕様

| 項目 | 内容 |
|------|------|
| **入力** | DeviceOrientation API |
| **検出** | 振る速度・方向・パターン |
| **3D表示** | 各ユーザーのペンライトをThree.js空間に配置 |
| **同期** | Supabase Realtimeで全員の動きを共有 |

### 振りパターン検出

| パターン | 検出条件 | エフェクト |
|---------|---------|-----------| 
| **縦振り** | Y軸の加速度変化 | 軌跡エフェクト |
| **横振り** | X軸の回転 | 円形光エフェクト |
| **回転** | Z軸の連続回転 | スパイラル光 |
| **静止** | 動きが少ない | パルス光 |

### 実装例
```typescript
// ジャイロセンサー取得
window.addEventListener('deviceorientation', (event) => {
  const { alpha, beta, gamma } = event;
  
  // 振りパターン検出
  if (Math.abs(beta - lastBeta) > threshold) {
    detectVerticalSwing();
  }
  
  // Supabase Realtimeで同期
  supabase.channel('room:123').send({
    type: 'broadcast',
    event: 'penlight',
    payload: { alpha, beta, gamma }
  });
});
```

---

## 11.3 拡張機能：シンガーのジェスチャー認識

### 概要
シンガーがリクエストに応えた時、**自動でジェスチャー認識**してボーナスポイント

### 仕様

| ジェスチャー | 検出方法（MediaPipe Hands） | スコア |
|------------|---------------------------|--------|
| **👋 手を振る** | 手の左右移動パターン | +500pt |
| **✌️ ピース** | 指の形状認識（2本立て） | +800pt |
| **🫶 ハート** | 両手の組み合わせ | +1000pt |
| **😘 投げキス** | 手のひら → 口元 → 前方への動き | +1200pt |

### メリット
- **手動ボタン不要**で没入感UP
- リクエスト受けた時の**リアル感**が増す
- カメラに映るだけで自動認識

### 実装例
```typescript
import { Hands } from '@mediapipe/hands';

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.onResults((results) => {
  if (results.multiHandedness) {
    // ピース検出
    if (detectPeace(results.landmarks)) {
      addBonus(800);
    }
  }
});
```

---

## 11.4 拡張機能：バーチャルステージ（AR/VR風）

### 概要
- **Three.jsで3D仮想ステージ**を構築
- 各役割がアバターとして存在
- カメラ背景を合成してAR風演出

### 仕様

| 要素 | 実装 |
|------|------|
| **ステージ** | Three.jsで3Dモデル配置 |
| **シンガーアバター** | カメラ映像をテクスチャとして貼り付け |
| **バンドアバター** | リズム判定に合わせて動くSDキャラ |
| **お邪魔演出** | パーティクルや爆発エフェクト |
| **ライティング** | 曲のビートに合わせて点滅 |

### 実装例（React Three Fiber）
```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export function VirtualStage() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} />
      
      {/* ステージ */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[10, 0.2, 10]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>
      
      {/* シンガーアバター */}
      <SingerAvatar />
      
      {/* バンドアバター */}
      <BandAvatar position={[-2, 0, -2]} />
      
      <OrbitControls />
    </Canvas>
  );
}
```

---

## 11.5 拡張機能：表情認識ボーナス

### 概要
シンガーの**笑顔度合い**を検出してボーナスポイント

### 仕様

| 表情 | 検出（MediaPipe Face Mesh） | 効果 |
|------|----------------------------|------|
| **😊 笑顔** | 口角の上昇検出 | ボーナス倍率 +10% |
| **😆 大笑い** | 口の開き + 目の細さ | ボーナス倍率 +20% |
| **😎 クール** | 無表情（ベースライン） | 通常倍率 |

### メリット
- **楽しんでいる感**を定量化
- 感情がスコアに反映される新体験
- パーティゲームとしての盛り上がり要素

---

## 11.6 技術スタック更新

Three.js連動機能を追加する場合、以下の技術を追加：

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| **3D描画** | Three.js + React Three Fiber (R3F) | 3D空間、アバター、エフェクト |
| **ポーズ検出** | MediaPipe Pose | ダンサーの骨格認識 |
| **手の認識** | MediaPipe Hands | シンガーのジェスチャー |
| **表情認識** | MediaPipe Face Mesh | 笑顔検出 |
| **ジャイロセンサー** | DeviceOrientation API | ペンライト振り検出 |
| **カメラアクセス** | getUserMedia (WebRTC) | Webカメラ映像取得 |
| **3Dモデル** | glTF / VRM形式 | アバターモデル |
| **3Dアニメーション** | Three.js AnimationMixer | アバターの動き |

---

## 11.7 実装優先度の提案

### フェーズ1：MVP（ミニマム）
- バンド（リズムゲーム）
- シンガー（歌詞表示）
- お邪魔（基本機能）

### フェーズ2：基本拡張
- **3Dペンライト（ジャイロ）** ← 実装比較的簡単
- ルーレット機能強化

### フェーズ3：高度な拡張
- **ダンサー役（カメラポーズ検出）** ← 目玉機能
- シンガーのジェスチャー認識

### フェーズ4：演出強化
- バーチャルステージ（AR風）
- 表情認識ボーナス

---

## 11.8 技育博デモ推奨構成

```
🎤 シンガー（カメラでジェスチャー認識）
🎸 バンド × 2人（リズムゲーム）
💃 ダンサー（カメラでポーズ検出） ← 目玉
📱 ペンライト × 数人（ジャイロ） ← 参加感UP
👻 お邪魔 × 1人
```

---

## 11.9 各アイデアの比較

| 機能 | 実装難易度 | インパクト | 技育博向き | おすすめ度 |
|------|-----------|-----------|-----------|-----------| 
| **3Dペンライト** | ⭐⭐ 低 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ 高 | ★★★★★ |
| **ダンサー役** | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 超高 | ⭐⭐⭐⭐⭐ 超高 | ★★★★★ |
| **ジェスチャー認識** | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐ 高 | ★★★★☆ |
| **バーチャルステージ** | ⭐⭐⭐⭐⭐ 超高 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中 | ★★★☆☆ |
| **表情認識** | ⭐⭐⭐ 中 | ⭐⭐⭐ 中 | ⭐⭐⭐ 中 | ★★★☆☆ |

---

## 11.10 パッケージインストール

```bash
# Three.js関連
npm install three @react-three/fiber @react-three/drei

# MediaPipe
npm install @mediapipe/pose @mediapipe/hands @mediapipe/face_mesh

# TensorFlow.js (オプション)
npm install @tensorflow/tfjs @tensorflow-models/posenet
```

---

## まとめ

Three.js連動機能は、MinKaraを**「見て楽しむ」から「動いて楽しむ」** に進化させます。  
技育博でのデモ展示で大きな差別化要素になる一方、実装コストも高いため、**段階的な導入**を推奨します。

---

## 関連ドキュメント

- [基本仕様（01-09）](./README.md#基本仕様mvp)
- [将来の拡張機能](./10_FUTURE_FEATURES.md)
