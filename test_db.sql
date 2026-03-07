DO $$
DECLARE
    p_rec RECORD;
BEGIN
    FOR p_rec IN SELECT user_id, group_code FROM public.profiles LOOP
        IF NOT EXISTS (SELECT 1 FROM public.book_lists WHERE user_id = p_rec.user_id AND is_default = true) THEN
            INSERT INTO public.book_lists (user_id, group_code, name, is_default, list_type)
            VALUES 
                (p_rec.user_id, p_rec.group_code, 'Okumak İstiyorum', true, 'want_to_read'),
                (p_rec.user_id, p_rec.group_code, 'Okuyorum', true, 'reading'),
                (p_rec.user_id, p_rec.group_code, 'Okudum', true, 'read'),
                (p_rec.user_id, p_rec.group_code, 'Yarıda Bıraktım', true, 'dnf');
        END IF;
    END LOOP;
END $$;
