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
| **プゥルヴー伝票** | 品番・品名・単価の正データ（JSON / Firestore） |
| **プゥルヴー在庫** | 別アプリ（共有コードなし） |

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
