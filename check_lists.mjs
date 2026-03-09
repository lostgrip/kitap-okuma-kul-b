import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Try to parse .env file directly
const envFile = readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        envVars[match[1].trim()] = val;
    }
});

const url = envVars.VITE_SUPABASE_URL;
// Use PUBLISHABLE_KEY instead of ANON_KEY since that's what's in the .env
const key = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key);

async function main() {
    const { data: users } = await supabase.from('profiles').select('user_id').limit(1);
    const userId = users?.[0]?.user_id || users?.[0]?.id;

    if (!userId) {
        console.log("No user found");
        return;
    }

    const { data: lists, error } = await supabase
        .from('book_lists')
        .select('id, name, is_default, list_type, group_code')
        .eq('user_id', userId);

    console.log("Found lists:", lists.length);
    console.log(JSON.stringify(lists, null, 2));
}

main().catch(console.error);
