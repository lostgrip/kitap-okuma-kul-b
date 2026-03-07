import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://bqtlgoovkavocwgradjt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdGxnb292a2F2b2N3Z3JhZGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTc2MTcsImV4cCI6MjA4NDQzMzYxN30.JuFCeWlyEOroGtI59MsPxZFSD3B6yO-rg_RUFlKOb2Q'
);

async function backfill() {
    console.log("Fetching all profiles...");
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('user_id, group_code');
    if (pErr) { console.error("Error fetching profiles:", pErr); return; }

    for (const profile of profiles || []) {
        const { data: lists } = await supabase
            .from('book_lists')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('is_default', true);

        if (!lists || lists.length === 0) {
            console.log(`Backfilling default lists for user ${profile.user_id}...`);
            const defaultLists = [
                { user_id: profile.user_id, group_code: profile.group_code, name: 'Okumak İstiyorum', is_default: true, list_type: 'want_to_read' },
                { user_id: profile.user_id, group_code: profile.group_code, name: 'Okuyorum', is_default: true, list_type: 'reading' },
                { user_id: profile.user_id, group_code: profile.group_code, name: 'Okudum', is_default: true, list_type: 'read' },
                { user_id: profile.user_id, group_code: profile.group_code, name: 'Yarıda Bıraktım', is_default: true, list_type: 'dnf' }
            ];
            const { error: insertErr } = await supabase.from('book_lists').insert(defaultLists);
            if (insertErr) console.error("Error inserting:", insertErr);
            else console.log(`Successfully mapped default lists for ${profile.user_id}`);
        } else {
            console.log(`User ${profile.user_id} already has ${lists.length} lists.`);
        }
    }
}
backfill();
