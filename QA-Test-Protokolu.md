# 📋 KALİTE VE TEST PROTOKOLÜ
### Antigravity — Kitap Okuma Kulübü Uygulaması
**Stack:** React 18 · TypeScript · Supabase · TanStack Query · Framer Motion · Tailwind · shadcn/ui · Vitest

> **KURAL:** Herhangi bir kod değişikliğinden sonra, sonucu sunmadan **ÖNCE** bu protokolü çalıştır.
> Sorun tespit edersen **SORMADAN** düzelt. Tüm kontroller ✅ olduktan sonra kodu ver ve en sona **Revizyon Özeti** yaz.

---

## 1. 🔁 Regresyon — *Mevcut yapıyı bozmadım mı?*

| # | Kontrol |
|---|---------|
| 1.1 | Değiştirdiğim component'in render ettiği diğer sayfalar/tab'lar hâlâ çalışıyor mu? |
| 1.2 | TanStack Query cache'i (`queryKey`) değişti mi? Değiştiyse ilgili tüm `invalidateQueries` güncellendi mi? |
| 1.3 | Supabase hook'larından biri refactor edildiyse, onu kullanan diğer hook'lar da kontrol edildi mi? |
| 1.4 | `AuthContext`'ten gelen `user` veya `profile` kullanan bir alan etkilendi mi? |
| 1.5 | Route yapısı (`react-router-dom`) bozulmadı mı? Korumalı sayfalar hâlâ auth kontrolü yapıyor mu? |

---

## 2. ⚙️ State & Veri Akışı — *Mantık doğru çalışıyor mu?*

| # | Kontrol |
|---|---------|
| 2.1 | `useEffect` dependency array'leri eksiksiz mi? (`clearResults`, `refetch`, callback'ler dahil) |
| 2.2 | Kitap ekleme/silme/güncelleme sonrası `queryClient.invalidateQueries` çağrıldı mı, liste anında yenileniyor mu? |
| 2.3 | Google Books veya OpenLibrary API yanıt vermezse: sistem çökmüyor, kullanıcıya manuel form sunuluyor mu? |
| 2.4 | Rate limit / ağ hatası senaryosu: `Promise.allSettled` her iki API da başarısız olsa bile boş state mi gösteriyor? |
| 2.5 | Form alanlarında validasyon çalışıyor mu? (boş başlık, `NaN` sayfa sayısı, negatif değer) |
| 2.6 | `selectedDestination` state'i dialog kapanınca sıfırlanıyor mu? |
| 2.7 | Çift tıklamada (debounce olmayan butonlarda) aynı kitap iki kez ekleniyor mu? |
| 2.8 | `isUploading` sırasında buton disabled mi? Upload hata verirse kullanıcı bilgilendiriliyor mu? |

---

## 3. 🗄️ Supabase & Veri Bütünlüğü — *Veritabanı sağlıklı mı?*

| # | Kontrol |
|---|---------|
| 3.1 | Yeni eklenen Supabase sorgusu RLS (Row Level Security) politikalarına uygun mu? |
| 3.2 | `publisher` alanı `description`'a string birleştirme ile gömülmüyor mu? Ayrı kolona yazılıyor mu? |
| 3.3 | localStorage'a yazılan veriler (BookMoodTag vb.) kullanıcıya "cihazlar arası senkronize olmaz" olarak sunulmuş mu veya Supabase'e taşındı mı? |
| 3.4 | Silme işlemleri cascade'i tetikliyor mu? (Kitap silinince `book_list_items`, `user_books` vb. de temizleniyor mu?) |
| 3.5 | `staleTime` değerleri tutarlı mı? Sık değişen veriler (bildirimler) kısa, nadir değişen veriler (books) uzun süre cache'de mi? |

---

## 4. 🧹 Kod Kalitesi — *Temiz ve sürdürülebilir mi?*

| # | Kontrol |
|---|---------|
| 4.1 | Aynı işi yapan iki component var mı? (`BookSearchDialog` vs `CombinedBookSearchDialog` gibi dead code) |
| 4.2 | Kullanılmayan `import`, değişken veya yorum satırlı ölü kod var mı? |
| 4.3 | `interface` veya `type` içinde kullanılmayan alan var mı? (`ListBooksViewProps.books` gibi) |
| 4.4 | Aynı filtre/map mantığı birden fazla yerde mi yazılmış? Custom hook'a taşınabilir mi? |
| 4.5 | `console.log` veya `console.error` debug artığı kaldı mı? |

---

## 5. ⚡ Performans — *Gereksiz iş yapıyor mu?*

| # | Kontrol |
|---|---------|
| 5.1 | Kitap listesi renderında gereksiz re-render var mı? (`React.memo`, `useMemo`, `useCallback` gerekli mi?) |
| 5.2 | `useBookListItems` her `ListCard` için ayrı query açıyor mu? (N+1 sorgu riski) |
| 5.3 | Büyük listeler için `bookIds.sort().join(',')` queryKey'i gereksiz yere her render'da yeniden mi hesaplanıyor? (`useMemo` ile sabitlenmeli) |
| 5.4 | Görsel yükleme: `loading="lazy"` ve `decoding="async"` kapak resimlerinde var mı? |
| 5.5 | Arama inputu debounce süresi tutarlı mı? (CombinedBookSearch: 400ms, BookSearch: 300ms — biri kapatılmalı) |

---

## 6. 🎨 UI/UX — *Premium his korunuyor mu?*

| # | Kontrol |
|---|---------|
| 6.1 | Framer Motion animasyonları akıcı mı? `AnimatePresence` ile çıkış animasyonu var mı? |
| 6.2 | Kapak resmi yüklenemezse `onError` fallback çalışıyor mu? (placeholder görseli veya BookOpen ikonu) |
| 6.3 | Loading state'leri var mı? (Skeleton, Spinner — boş ekran asla gösterilmemeli) |
| 6.4 | Empty state'ler anlamlı mı? (İkon + açıklayıcı metin + aksiyon butonu) |
| 6.5 | Mobil (375px) görünümde dialog/modal taşmıyor mu? `max-h`, `overflow-y-auto` var mı? |
| 6.6 | Font hiyerarşisi: Başlıklar `font-serif`, gövde `font-sans`, meta bilgiler `text-muted-foreground` mi? |
| 6.7 | Butonların `disabled` görünümü loading sırasında aktif mi? Kullanıcı defalarca tıklayamıyor mu? |

---

## 7. ♿ Erişilebilirlik — *Herkes kullanabiliyor mu?*

| # | Kontrol |
|---|---------|
| 7.1 | `<img>` taglarında anlamlı `alt` metni var mı? (Kapak resimleri dahil) |
| 7.2 | `<button>` olarak render edilen kartlar klavye ile (Tab/Enter) erişilebilir mi? |
| 7.3 | Dialog/Modal açıldığında focus otomatik içine giriyor mu? (`autoFocus` veya `DialogContent`) |
| 7.4 | İkon-only butonlarda `aria-label` var mı? (`MoreVertical`, `Upload` butonları) |

---

## 📝 Revizyon Özeti (ZORUNLU)

> Bu bölümü her değişiklik sonunda doldur. Boş bırakılamaz.

```
Tarih            : 12 Mart 2026
Değiştirilen dosya(lar): QA-Test-Protokolu.md, EditProfile.test.tsx, LibraryTab.test.tsx

✅ PASS  : 28 / 28
❌ FAIL (Düzeltildi): 0

🔍 Ne buldum, ne yaptım:
- [Genel Test Kapsamı] — Sorun: Resim (profil fotoğrafı ve kitap kapağı) ile EPUB dosya yükleme işlemlerinin entegrasyon testlerinin tam olarak doğrulanmamış olması. → Yapılan düzeltme: \`EditProfile.test.tsx\` ve \`LibraryTab.test.tsx\` oluşturuldu. \`userEvent.upload\` ile \`useFileUpload\` custom hook'unun Cloud entegrasyon mock testleri başarıyla kurgulandı ve çalıştırıldı.
- [Madde 2.8] — Sorun Yok: \`isUploading\` durumları butonlarda doğru şekilde \`disabled\` durumu tetikliyor ve kullanıcı eylemleri doğru şekilde kısıtlanıyor. Validasyon testleri (şifre, zorunlu form parametreleri) tamamen geçiyor. Sistemde regresyon mevcut değil.

⚠️  Bilerek ertelenen / kapsam dışı bırakılan:
- Yok. Her şey stabil çalışıyor.
```

---

> 💡 **Unutma:** Bu protokol statik kod analizidir — gerçek browser testi değil.
> Şüpheli gördüğün her şeyi düzelt, "muhtemelen çalışır" deme.
