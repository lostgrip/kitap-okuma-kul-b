/**
 * Centralised image optimisation helpers.
 *
 * Strategy:
 *   - Supabase Storage URLs  → append Supabase Transform query params
 *   - Open Library CDN URLs → swap size suffix (S/M/L)
 *   - Unsplash URLs         → append w/q params (already sized, but may be missing them)
 *   - Everything else       → return unchanged
 */

const FALLBACK_COVER =
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=300&fit=crop&q=70';

interface ImageOptions {
    /** Target width in pixels (default: 200) */
    width?: number;
    /** Target height in pixels (default: 300) */
    height?: number;
    /** Quality 1-100 (default: 75) */
    quality?: number;
}

/**
 * Returns a resized/optimised version of a book cover URL.
 * Safe to call with null/undefined – falls back to the placeholder.
 */
export function getOptimizedCoverUrl(
    url: string | null | undefined,
    options: ImageOptions = {}
): string {
    const { width = 200, height = 300, quality = 75 } = options;

    if (!url) return FALLBACK_COVER;

    try {
        const parsed = new URL(url);

        // ── Supabase Storage ──────────────────────────────────────────────────────
        // Pattern: *.supabase.co/storage/v1/object/public/…
        if (parsed.hostname.endsWith('.supabase.co') && parsed.pathname.includes('/storage/')) {
            // Supabase Image Transformation is at /storage/v1/render/image/…
            const renderPath = parsed.pathname.replace(
                /\/storage\/v1\/object\//,
                '/storage/v1/render/image/'
            );
            const params = new URLSearchParams({
                width: String(width),
                height: String(height),
                quality: String(quality),
                resize: 'cover',
            });
            return `${parsed.origin}${renderPath}?${params.toString()}`;
        }

        // ── Open Library covers.openlibrary.org ───────────────────────────────────
        if (parsed.hostname === 'covers.openlibrary.org') {
            // Replace -S / -M / -L suffix with -M (medium) or -S (small)
            const targetSuffix = width <= 120 ? 'S' : 'M';
            return url.replace(/-[SML]\.jpg$/, `-${targetSuffix}.jpg`);
        }

        // ── Unsplash ──────────────────────────────────────────────────────────────
        if (parsed.hostname === 'images.unsplash.com') {
            parsed.searchParams.set('w', String(width));
            parsed.searchParams.set('h', String(height));
            parsed.searchParams.set('fit', 'crop');
            parsed.searchParams.set('q', String(quality));
            return parsed.toString();
        }

        // ── Google Books / Books API thumbnails ───────────────────────────────────
        if (parsed.hostname === 'books.google.com' || parsed.hostname === 'books.googleusercontent.com') {
            // GB thumbnails support `zoom=` param: 1=small, 5=medium, 6=large
            parsed.searchParams.set('zoom', width <= 120 ? '1' : '5');
            return parsed.toString();
        }

        // Everything else – return as-is
        return url;
    } catch {
        // Invalid URL
        return FALLBACK_COVER;
    }
}

export { FALLBACK_COVER };
