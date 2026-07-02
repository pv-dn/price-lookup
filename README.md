# 価格参照

プゥル・ヴー向けの客先別価格参照アプリ。

## 本番 URL

https://pv-dn.github.io/price-lookup/

## ローカル開発

```powershell
cd "C:\Users\e--yo\Apps\価格参照"
npm install
npm run dev
```

## デプロイ

`main` ブランチへ push すると GitHub Actions が GitHub Pages に公開します。

## デスクトップショートカット

```powershell
cd "C:\Users\e--yo\Apps\価格参照"
.\install-desktop-shortcut.ps1
```

アイコンは **¥** マークです。

## 連携

- プゥルヴー伝票のバックアップ JSON 取込
- Firestore 同期（伝票アプリと同じ Firebase）
- 手入力客先・品目マスタ（ジャンル分け）

詳細は [PROJECT.md](./PROJECT.md)
