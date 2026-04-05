import { createClient } from '@/utils/supabase/client';

export async function submitWaitlist(
  email: string,
  role: 'customer' | 'vendor' = 'customer',
  comment?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      // If comment provided, update the existing entry
      if (comment) {
        const { error: updateError } = await supabase
          .from('waitlist')
          .update({ comment })
          .eq('email', email.toLowerCase());

        if (updateError) {
          console.error('Waitlist update error:', updateError.message, updateError.code);
        }
      }
      return { success: true, message: "You're already on the list!" };
    }

    // Insert new entry
    const { error } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase(),
        role,
        ...(comment && { comment }),
      });

    if (error) {
      // Unique constraint violation
      if (error.code === '23505') {
        return { success: true, message: "You're already on the list!" };
      }
      console.error('Waitlist insert error:', error.message, error.code, error.details, error.hint);
      return { success: false, message: 'Something went wrong. Please try again.' };
    }

    return { success: true, message: "You're in! We'll be in touch." };
  } catch (err) {
    console.error('Waitlist error:', err);
    return { success: false, message: 'Something went wrong. Please try again.' };
  }
}

export async function getWaitlistCount(): Promise<number> {
  try {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
