
import { supabase } from './supabase';

/**
 * User roles available in the application
 */
export type Role = 'student' | 'teacher';

/**
 * Profile data structure
 */
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at?: string;
  updated_at?: string;
};

/**
 * Data required when creating a profile
 */
export type CreateProfileData = {
  id: string;
  email: string;
  full_name?: string | null;
  role?: Role;
};

/**
 * Data allowed when updating a profile
 */
export type UpdateProfileData = {
  full_name?: string | null;
  role?: Role;
};

/**
 * Standard API response
 */
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

/**
 * Fields returned from Supabase
 */
const PROFILE_FIELDS =
  'id, email, full_name, role, created_at, updated_at';

/**
 * Standard error handler
 */
function handleError(action: string, error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
        error !== null &&
        'message' in error
      ? String((error as { message: unknown }).message)
      : 'An unexpected error occurred.';

  console.error(`Error ${action}:`, error);

  return message;
}

/**
 * Clean and validate a user ID
 */
function cleanUserId(userId: string): string | null {
  const id = userId?.trim();

  return id ? id : null;
}

/**
 * Clean and validate an email
 */
function cleanEmail(email: string): string | null {
  const value = email?.trim().toLowerCase();

  if (!value) return null;

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(value) ? value : null;
}

/**
 * Clean full name
 */
function cleanFullName(fullName?: string | null): string | null {
  if (fullName === null || fullName === undefined) {
    return null;
  }

  const value = fullName.trim();

  return value || null;
}

/**
 * Get the currently logged-in user's profile
 */
export async function getCurrentProfile(): Promise<ApiResponse<Profile>> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      return {
        data: null,
        error: 'No authenticated user found.',
      };
    }

    return await getProfile(user.id);
  } catch (err) {
    return {
      data: null,
      error: handleError('getting current profile', err),
    };
  }
}

/**
 * Get a profile using the user's ID
 */
export async function getProfile(
  userId: string
): Promise<ApiResponse<Profile>> {
  const cleanId = cleanUserId(userId);

  if (!cleanId) {
    return {
      data: null,
      error: 'User ID is required.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('id', cleanId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        data: null,
        error: 'Profile not found.',
      };
    }

    return {
      data: data as Profile,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: handleError('getting profile', err),
    };
  }
}

/**
 * Get all profiles
 *
 * Useful for teacher/admin dashboards.
 */
export async function getProfiles(): Promise<ApiResponse<Profile[]>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: (data ?? []) as Profile[],
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: handleError('getting profiles', err),
    };
  }
}

/**
 * Get profiles by role
 */
export async function getProfilesByRole(
  role: Role
): Promise<ApiResponse<Profile[]>> {
  if (role !== 'student' && role !== 'teacher') {
    return {
      data: null,
      error: 'Invalid user role.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('role', role)
      .order('full_name', { ascending: true });

    if (error) throw error;

    return {
      data: (data ?? []) as Profile[],
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: handleError(`getting ${role} profiles`, err),
    };
  }
}

/**
 * Create a new profile
 */
export async function createProfile(
  profile: CreateProfileData
): Promise<ApiResponse<Profile>> {
  const cleanId = cleanUserId(profile.id);
  const cleanEmail = cleanEmailValue(profile.email);

  if (!cleanId) {
    return {
      data: null,
      error: 'User ID is required.',
    };
  }

  if (!cleanEmail) {
    return {
      data: null,
      error: 'A valid email address is required.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: cleanId,
        email: cleanEmail,
        full_name: cleanFullName(profile.full_name),
        role: profile.role ?? 'student',
      })
      .select(PROFILE_FIELDS)
      .single();

    if (error) throw error;

    return {
      data: data as Profile,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: handleError('creating profile', err),
    };
  }
}

/**
 * Alias used internally to avoid name conflicts
 */
function cleanEmailValue(email: string): string | null {
  return cleanEmail(email);
}

/**
 * Create or update a profile
 *
 * Useful after registration or OAuth login.
 */
export async function upsertProfile(
  profile: CreateProfileData
): Promise<ApiResponse<Profile>> {
  const cleanId = cleanUserId(profile.id);
  const cleanEmail = cleanEmailValue(profile.email);

  if (!cleanId) {
    return {
      data: null,
      error: 'User ID is required.',
    };
  }

  if (!cleanEmail) {
    return {
      data: null,
      error: 'A valid email address is required.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: cleanId,
          email: cleanEmail,
          full_name: cleanFullName(profile.full_name),
          role: profile.role ?? 'student',
        },
        {
          onConflict: 'id',
        }
      )
      .select(PROFILE_FIELDS)
      .single();

    if (error) throw error;

    return {
      data: data as Profile,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: handleError('upserting profile', err),
    };
  }
}

/**
 * Update an existing profile
 */
export async function updateProfile(
  userId: string,
  updates: UpdateProfileData
): Promise<ApiResponse<Profile>> {
  const cleanId = cleanUserId(userId);

  if (!cleanId) {
    return {
      data: null,
      error: 'User ID is required.',
    };
  }

  const payload: Partial<Profile> = {};

  if (updates.full_name !== undefined) {
    payload.full_name = cleanFullName(updates.full_name);
  }

  if (updates.role !== undefined) {
    if (updates.role !== 'student' && updates.role !== 'teacher') {
      return {
        data: null,
        error: 'Invalid user role.',
      };
    }

    payload.role = updates.role;
  }

  if (Object.keys(payload).length === 0) {
    return {
      data: null,
      error: 'No profile changes were provided.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', cleanId)
      .select(PROFILE_FIELDS)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        data: null,
        error: 'Profile not found.',
      };
    }

    return {
      data: data as Profile,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: handleError('updating profile', err),
    };
  }
}

/**
 * Update the current logged-in user's profile
 */
export async function updateCurrentProfile(
  updates: UpdateProfileData
): Promise<ApiResponse<Profile>> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      return {
        data: null,
        error: 'No authenticated user found.',
      };
    }

    return await updateProfile(user.id, updates);
  } catch (err) {
    return {
      data: null,
      error: handleError('updating current profile', err),
    };
  }
}

/**
 * Check whether a profile exists
 */
export async function profileExists(
  userId: string
): Promise<{ exists: boolean; error: string | null }> {
  const cleanId = cleanUserId(userId);

  if (!cleanId) {
    return {
      exists: false,
      error: 'User ID is required.',
    };
  }

  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('id', cleanId);

    if (error) throw error;

    return {
      exists: (count ?? 0) > 0,
      error: null,
    };
  } catch (err) {
    return {
      exists: false,
      error: handleError('checking profile existence', err),
    };
  }
}

/**
 * Delete a profile
 */
export async function deleteProfile(
  userId: string
): Promise<{ error: string | null }> {
  const cleanId = cleanUserId(userId);

  if (!cleanId) {
    return {
      error: 'User ID is required.',
    };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', cleanId);

    if (error) throw error;

    return {
      error: null,
    };
  } catch (err) {
    return {
      error: handleError('deleting profile', err),
    };
  }
}
