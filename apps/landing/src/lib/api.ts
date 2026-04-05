const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function submitWaitlist(
  email: string,
  role: 'customer' | 'vendor' = 'customer',
  comment?: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/v1/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role, ...(comment && { comment }) }),
  });

  if (res.status === 201) {
    return { success: true, message: "You're in! We'll be in touch." };
  }

  if (res.status === 409) {
    return { success: true, message: "You're already on the list!" };
  }

  if (res.status === 429) {
    return { success: false, message: 'Too many requests. Please try again later.' };
  }

  return { success: false, message: 'Something went wrong. Please try again.' };
}

export async function getWaitlistCount(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/v1/waitlist/count`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
}
