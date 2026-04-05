import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const urlPrefix = process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'NOT SET';
  const keyPrefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'NOT SET';

  let tableTest = 'not tested';
  let insertTest = 'not tested';

  try {
    const supabase = createClient();

    // Test select
    const { data, error: selectError } = await supabase
      .from('waitlist')
      .select('id')
      .limit(1);

    tableTest = selectError
      ? `FAIL: ${selectError.message} (code: ${selectError.code})`
      : `OK: ${data?.length ?? 0} rows returned`;

    // Test insert with a dummy that we immediately delete
    const testEmail = `debug-test-${Date.now()}@test.invalid`;
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({ email: testEmail, role: 'customer' });

    if (insertError) {
      insertTest = `FAIL: ${insertError.message} (code: ${insertError.code})`;
    } else {
      insertTest = 'OK: insert succeeded';
      // Clean up
      await supabase.from('waitlist').delete().eq('email', testEmail);
    }
  } catch (err: any) {
    tableTest = `EXCEPTION: ${err.message}`;
  }

  return NextResponse.json({
    env: { hasUrl, hasKey, urlPrefix, keyPrefix },
    tableTest,
    insertTest,
  });
}
