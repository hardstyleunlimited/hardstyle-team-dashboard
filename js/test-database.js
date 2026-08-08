import { supabase } from './supabase.js';

async function testDatabase() {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .limit(5);

  if (error) {
    console.error('SUPABASE ERROR:', error);
    return;
  }

  console.log('DATABASE CONNECTED:', data);
}

testDatabase();