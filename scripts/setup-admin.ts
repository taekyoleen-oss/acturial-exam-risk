/**
 * 관리자 계정 초기 설정 스크립트
 *
 * 사용법:
 *   npx tsx scripts/setup-admin.ts --email=admin@example.com --password=yourpassword
 *
 * 실행 결과:
 *   - Supabase Auth에 관리자 계정 생성 (또는 기존 계정 조회)
 *   - act_user_profiles에 approved 상태로 등록
 *   - .env.local의 ADMIN_USER_ID 자동 업데이트
 */

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

function updateEnvFile(key: string, value: string) {
  const envPath = path.join(process.cwd(), '.env.local');
  let content = fs.readFileSync(envPath, 'utf-8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, content);
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const email = args.find((a) => a.startsWith('--email='))?.split('=')[1];
  const password = args.find((a) => a.startsWith('--password='))?.split('=')[1];

  if (!email || !password) {
    console.error('사용법: npx tsx scripts/setup-admin.ts --email=admin@example.com --password=yourpassword');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 기존 계정 확인
  let userId: string;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users.find((u) => u.email === email);

  if (existing) {
    userId = existing.id;
    console.log(`✓ 기존 계정 발견: ${email} (${userId})`);
  } else {
    // 새 계정 생성
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: '관리자' },
    });
    if (error) {
      console.error('계정 생성 실패:', error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`✓ 관리자 계정 생성: ${email} (${userId})`);
  }

  // act_user_profiles에 approved 상태로 upsert
  const { error: profileError } = await supabase
    .from('act_user_profiles')
    .upsert(
      {
        id: userId,
        email,
        name: '관리자',
        status: 'approved',
        approved_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    console.error('프로필 설정 실패:', profileError.message);
    process.exit(1);
  }
  console.log('✓ 프로필 approved 설정 완료');

  // .env.local 업데이트
  updateEnvFile('ADMIN_USER_ID', userId);
  console.log(`✓ .env.local ADMIN_USER_ID 업데이트: ${userId}`);

  console.log('\n✅ 관리자 설정 완료!');
  console.log('  Vercel 환경변수도 ADMIN_USER_ID를 아래 값으로 업데이트하세요:');
  console.log(`  ADMIN_USER_ID=${userId}`);
  console.log('\n  이제 로컬 서버를 재시작하고 /login 에서 로그인하세요.');
}

main().catch((err) => {
  console.error('오류:', err);
  process.exit(1);
});
