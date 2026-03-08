-- Add unique constraints for safe upsert operations
ALTER TABLE public.user_books
ADD CONSTRAINT user_books_user_id_book_id_unique UNIQUE (user_id, book_id);

ALTER TABLE public.reading_progress
ADD CONSTRAINT reading_progress_user_id_book_id_unique UNIQUE (user_id, book_id);