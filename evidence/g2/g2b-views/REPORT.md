# G2-B 検証レポート — MAPA · TIEMPO · FOTO + コントラスト

日付: 実施日時点。対象ブランチ `g2-competition-cut`。
スコープ: `docs/gates/G2.md` の F4・S1–S3・C1–C2・A1/A3（ビュー系）。
ホットスポットの編集ストーリーは未実装（意図的なスコープ外）。

## ビュー状態モデル（S1/S2/S3）

- `app.mode: 'map' | 'time' | 'photo'` を単一の状態として保持。`?view=` でシリアライズ（`map` は省略）。
- 不変条件: `place`・`selected_year`・カメラ（center/zoom/bearing/pitch）は全ビューで共有・維持。
- `playYear` の決定的ルール: **ビュー切替で保持**。`time` ビューで `playYear === null` のとき `selected_year` にアンカーして一時停止。`+page.svelte` で検証済み。
- URL はビュー変更時の離散イベントのみ書き込み。`play` は一時停止時のみ（G2-A と同じ）。

| チェック | 結果 |
|---|---|
| s1_view_in_url / s1_url_params | PASS — `view=time`/`view=photo` がURLへ |
| s2_no_reset | PASS — 5回の切替で year=1987, place=leioa, カメラ完全一致 |
| rule_time_anchor | PASS — time 进入時 playYear=1987 にアンカー・停止 |
| rule_playYear_persists | PASS — スクラブ1999が map 切替後も保持、year 不変 |
| s3_deeplink | PASS — `?view=photo` と `?view=time&play=2001` を再現 |
| s3_back_forward | PASS — ブラウザ back で前ビューに復帰 |

## F4 フォトモード

- `PhotoPanel.svelte`: prev/next キャンペーンナビ、出版社・名目年・実飛行レンジ（宣言時）・ライセンスを全状態で表示。
- `ortho-probe.svelte.ts`: OrthoControls から共有プローブを抽出。`activateOrtho` は要求されたキャンペーンのみを正確にプローブ（暗黙の代替なし）、"last probe wins" のシーケンス制御で古い応答を破棄。
- ビュー切替ではイメージを一切要求しない（`net_no_ortho_on_switch`: 5遷移で0リクエスト）。プローブは明示的な有効化でのみ走る（33リクエスト=本体+代替探索）。

| チェック | 結果 |
|---|---|
| f4_provenance_always | PASS — 出版社・名目年・CC BY が有効化前から表示 |
| f4_activate_probes | PASS — 明示有効化でのみプローブ |
| f4_nav_exact | PASS — ボタン表記と実キャンペーンが厳密一致（1990→1995） |
| f4_nav_probes / f4_provenance_persists | PASS |

## C1/C2 コントラスト

- `Contrast.svelte`: C-05（件数シェア）と C-08（フットプリントシェア）を同じ `selected_year` で併記。両分母を明示（「現在の建物で年が分かるもの」「年が分かり形状が有効な建物のフットプリント」）。
- `c1_consistent_c05`: コントラストの件数値が見出しの C-05 と一致（47.6≈47.6）。
- `c2_no_interpretation`: 「compact growth/sprawl/densification/dispersion」等の解釈語を含まないことを正規表現で検証。差異の提示は「建物の数と占有面積は別の物語を語る」までに留める。

## 320px キャンペーンマーカー

- tick（2–4px の視覚マーカー）とヒットボックス（44×44px 透明）を分離。10マーカーすべてヒットボックス≥44px・tick 2–4px を計測確認（`a320_hitbox_vs_tick`）。
- `overflow-x: clip` を `.timeband` に適用し、端のヒットボックスはみ出しによる横スクロールを解消（`a320_no_overflow` PASS）。軸ラベルは padding 内に残るため切れない。
- 未達キャンペーンの年テキストは `#6b6b63`（AA 準拠）。未到達状態は淡い tick で表現。`aria-hidden` の tick と実名付きボタンの分離は維持。

## アクセシビリティ（axe, 0 violations）

| 状態 | 結果 |
|---|---|
| map ビュー（コントラスト含む） | PASS |
| time 一時停止 | PASS |
| time 再生中 | PASS |
| photo AVAILABLE | PASS |
| photo NOT_COVERED（404 スタブ） | PASS |
| photo SERVICE_ERROR（abort スタブ） | PASS |

## ネットワーク / パフォーマンス

- ビュー切替・TIEMPO アンカー・再生でオルソフォト要求 0。
- 再生は年毎の series 再取得をしない（フロントはプリロード済み `ys` のみ使用）。
- ヒープ: 3再生サイクルで 28.1→29.9MB（情報レベル、増大は軽微）。

## 回帰

- `g2a_play.mjs`: 20/20 PASS（tick/hitbox 変更後も互換）。
- `g1r_cell_detail.mjs`: 17/17 PASS。`g1r_ortho_preview.mjs`: 6/6 PASS。
- `launch_browser_smoke.mjs`: Chromium/Firefox/WebKit PASS、zoom400 クリップなし。
- G2-B ハーネス: Chromium 27/27、Firefox 21/21、WebKit 21/21（エンジン限定項を除く）。

## 証跡

`view-map.png` `view-time.png` `view-photo.png` `contrast.png` `timeline-320-ticks.png`、JSON: `g2b-views{,-firefox,-webkit}.json`。

## 未完了 / 残課題

- G2.md の hotspot 系基準（H1–H3 系、ストーリー品質 HR3）は未実装・未検証 — 次フェーズ。
- 実機モバイル・NVDA は `LAUNCH_QUALITY.md` の PENDING_HUMAN（G2 の GO 条件ではない）。

## 結論

**G2-B PASS**（F4・S1–S3・C1–C2・関連 A 基準）。ゲート未完了分は hotspot ストーリーのみ。
