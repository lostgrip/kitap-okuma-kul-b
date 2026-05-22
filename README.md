# Kitap İmecesi 📚

Arkadaşlarınızla birlikte okumayı, tartışmayı ve keşfetmeyi kolaylaştıran bir kitap kulübü uygulaması.

## Teknolojiler

- **Vite** + **React 18** + **TypeScript**
- **shadcn/ui** + **Tailwind CSS** (UI)
- **TanStack Query** (server state)
- **Framer Motion** (animations)
- **Supabase** (auth, database, storage)
- **Vitest** + **Testing Library** (tests)

## Yerel Geliştirme

Node.js (önerilen: 20+) ve npm gerekli.

```sh
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasındaki Supabase değerlerini kendi projenden doldur

# 3. Geliştirme sunucusunu başlat
npm run dev
```

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Vite geliştirme sunucusu |
| `npm run build` | Üretim için derleme |
| `npm run preview` | Derlenen sürümü önizle |
| `npm run lint` | ESLint ile kod kontrolü |
| `npm test` | Vitest test koşumu |
| `npm run test:watch` | Testleri izleme modunda çalıştır |

## Proje Yapısı

```
src/
├── components/    # Yeniden kullanılabilir UI bileşenleri (shadcn + uygulamaya özel)
├── pages/         # Route düzeyinde sayfalar
├── hooks/         # Supabase + TanStack Query custom hook'ları
├── contexts/      # AuthContext vb. global state
├── integrations/  # Supabase client + types
├── lib/           # Yardımcı fonksiyonlar
└── test/          # Test setup
supabase/
├── functions/     # Edge Functions
└── migrations/    # Veritabanı şeması
```

## Kalite Protokolü

Kod değişikliklerinden önce `QA-Test-Protokolu.md` dosyasındaki kontrol listesini uygula.
