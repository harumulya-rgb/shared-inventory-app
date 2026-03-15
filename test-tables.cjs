const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking tables...');
    const tables = ['profiles', 'fields', 'activities', 'materials', 'entries', 'workgroups', 'squads', 'teams'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table '${table}' does not exist or error:`, error.message);
        } else {
            console.log(`Table '${table}' exists.`);
            if (data && data.length > 0) {
                console.log(`Columns in '${table}':`, Object.keys(data[0]));
            } else {
                // If empty, we can't see columns this way easily without the RPC.
                // But we can try a hacky select
                const { data: cols, error: colError } = await supabase.from(table).select('*').limit(0);
                if (!colError) {
                    // This won't work to get keys if empty.
                }
            }
        }
    }
}
checkTables().catch(console.error);
