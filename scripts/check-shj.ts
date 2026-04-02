import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local 파일이 없습니다.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
}

async function main() {
  loadEnv();

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = 'shj00578@gmail.com';
  
  // 1. Check auth.users
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Failed to list users:', userError);
    return;
  }

  const user = userData.users.find(u => u.email === email);
  if (!user) {
    console.log(`User ${email} not found in auth.users!`);
    return;
  }
  
  console.log('Found user in auth.users:');
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);

  // 2. Check act_user_profiles
  const { data: profileArgs, error: profileError } = await supabase
    .from('act_user_profiles')
    .select('*')
    .eq('email', email);

  if (profileError) {
    console.error('Failed to query profiles:', profileError);
    return;
  }

  if (profileArgs && profileArgs.length > 0) {
    console.log('\nFound user profile:');
    console.log(JSON.stringify(profileArgs[0], null, 2));
  } else {
    console.log('\nUser profile NOT found in act_user_profiles!');
    
    // Check if ID matches
    const { data: idProfile } = await supabase.from('act_user_profiles').select('*').eq('id', user.id);
    if (idProfile && idProfile.length > 0) {
        console.log('\nFound profile by ID instead of email:');
        console.log(JSON.stringify(idProfile[0], null, 2));
    }
  }
}

main().catch(console.error);
