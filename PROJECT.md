# 価格参照（price-lookup）

| 項目 | 内容 |
|------|------|
| **ID** | `price-lookup` |
| **呼び名** | 価格参照 |
| **フォルダ** | `C:\Users\e--yo\Apps\価格参照` |
| **会社** | 株式会社プゥル・ヴー（ホワイト事業部） |

## 概要

客先別単価の参照専用アプリ。手書き納品書を書きながら価格を確認する用途。

## 本番 URL

https://pv-dn.github.io/price-lookup/

## リポジトリ

https://github.com/pv-dn/price-lookup

## 他アプリとの関係

| 呼び名 | 関係 |
|--------|------|
| **プゥルヴー伝票** | 品番・品名・単価の正データ（JSON / Firestore）。**コードは共有していません** |
| **プゥルヴー在庫** | 別アプリ（共有コードなし） |

## Cursor で開くとき

- **このフォルダだけ**開いてください: `C:\Users\e--yo\Apps\価格参照`
- または次のどちらか（おすすめ）:
  - `Apps\Cursor用\workspaces\価格参照.code-workspace` をダブルクリック
  - `open-in-cursor.ps1` を実行
- **Shift Board / シフト管理のウィンドウに価格参照を開かない**でください  
  （タイトルが `Shift Board - Cursor` のままになる＝別アプリと混在した状態です）
- ウィンドウ上部のタイトルが **「ホワイト事業部価格表 - Cursor」** になっていれば OK

## デプロイ

```powershell
cd "C:\Users\e--yo\Apps\価格参照"
git add .
git commit -m "説明"
git push origin main
```

## 変更履歴メモ

| 日付 | 内容 |
|------|------|
| 2026-07-02 | 初回デプロイ・¥アイコン・品目マスタ・一覧表 |
