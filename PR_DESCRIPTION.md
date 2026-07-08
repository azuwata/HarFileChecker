# PR: Refactor event handlers and security fixes

## 概要
- `index.html` のインラインイベントハンドラ（`onclick`）を削除し、`script.js` 側で `addEventListener` を使ってイベントを登録するようにリファクタしました。
- 初期ロード時のイベントワイヤリングを `DOMContentLoaded` で行う実装を追加。
- 上記に伴い、各ボタンに `id` (`addTagBtn`, `checkBtn`, `exportBtn`) を付与し、削除ボタンには `remove-tag-btn` クラスを付与しました。

## 併せて行ったセキュリティ/堅牢化修正（既存コミット済み）
- HAR 内の値表示に対する XSS 対策（`escapeHtml()` を使用）。
- HAR 構造の存在チェックを追加（不正な HAR の場合は UI に警告）。
- 検索の大文字小文字不一致を修正（単一/複数キーワード検索共に小文字正規化で比較）。
- CSV 出力での Excel インジェクション対策を追加（先頭の `=+\-@` を `'` で無害化）。
- `addTagInput()` の DOM 生成を `innerHTML` から DOM API に変更（inline handler ではなく `addEventListener` を付与）。

## 変更ファイル
- index.html
- script.js
- README.md (未編集)

## 影響範囲
- UI の動作は変わりません（イベント駆動の実装を移行しただけ）。
- 外部からの HAR ファイルや入力値に起因する XSS/CSV注入のリスクを低減します。

## チェックリスト
- [ ] 手元で HAR サンプルを使った動作確認
- [ ] テストケース（簡易HAR）で再現チェック

## 説明（レビュワー向け）
- 主要な差分は `index.html` の属性変更と `script.js` に追加した `DOMContentLoaded` ブロックです。
- 他のセキュリティ修正は既に同ブランチ内で別コミットとして含まれています。
