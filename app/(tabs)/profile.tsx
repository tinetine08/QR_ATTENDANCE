import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, Profile, updateProfile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    const { data: profileData, error } = await getProfile(user.id);

    if (error) {
      Alert.alert('Unable to load profile', error);
      setProfile(null);
      setDraftName('');
      return;
    }

    setProfile(profileData ?? null);
    setDraftName(profileData?.full_name ?? '');
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;

    const trimmedName = draftName.trim();

    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    const { error } = await updateProfile(user.id, {
      full_name: trimmedName,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Unable to save', error);
      return;
    }

    setProfile((prev) =>
      prev ? { ...prev, full_name: trimmedName } : prev
    );

    setDraftName(trimmedName);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setDraftName(profile?.full_name ?? '');
    setEditing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              await signOut();
              router.replace('/login');
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.message || 'Failed to sign out.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const fullName = profile?.full_name || 'User';
  const role = profile?.role === 'teacher' ? 'Teacher' : 'Student';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name.charAt(0).toUpperCase())
    .join('');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>
          Manage your account information
        </Text>
      </View>

      {/* Profile Hero */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials || 'U'}
          </Text>
        </View>

        <View style={styles.profileMain}>
          <Text style={styles.profileName} numberOfLines={1}>
            {fullName}
          </Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name={role === 'Teacher' ? 'school-outline' : 'person-outline'}
              size={14}
              color={COLORS.primary}
            />
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>
      </View>

      {/* Account Information */}
      <Text style={styles.sectionTitle}>Account Information</Text>

      <View style={styles.infoCard}>
        {/* Full Name */}
        <View style={styles.infoItem}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.label}>Full Name</Text>

            {editing ? (
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.input}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
            ) : (
              <Text style={styles.value}>
                {fullName}
              </Text>
            )}
          </View>

          {!editing && (
            <Pressable
              onPress={() => setEditing(true)}
              style={styles.editButton}
              hitSlop={10}
            >
              <Ionicons
                name="create-outline"
                size={19}
                color={COLORS.primary}
              />
            </Pressable>
          )}
        </View>

        {editing && (
          <View style={styles.editActions}>
            <Pressable
              onPress={handleCancelEdit}
              style={styles.cancelButton}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSaveName}
              style={styles.saveButton}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.textOnPrimary}
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark"
                    size={17}
                    color={COLORS.textOnPrimary}
                  />
                  <Text style={styles.saveText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.divider} />

        {/* Email */}
        <View style={styles.infoItem}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.label}>Email Address</Text>
            <Text style={styles.value}>
              {profile?.email || user?.email || 'Not available'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* User ID */}
        <View style={styles.infoItem}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="finger-print-outline"
              size={20}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.label}>User ID</Text>
            <Text
              style={styles.userId}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {profile?.id || user?.id || 'Not available'}
            </Text>
          </View>
        </View>
      </View>

      {/* Account Role */}
      <Text style={styles.sectionTitle}>Account Type</Text>

      <View style={styles.roleCard}>
        <View style={styles.roleIcon}>
          <Ionicons
            name={role === 'Teacher' ? 'school' : 'person'}
            size={24}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.roleInfo}>
          <Text style={styles.roleCardTitle}>{role} Account</Text>
          <Text style={styles.roleCardDescription}>
            {role === 'Teacher'
              ? 'You have access to teacher features and tools.'
              : 'You have access to student features and tools.'}
          </Text>
        </View>

        <Ionicons
          name="checkmark-circle"
          size={22}
          color={COLORS.primary}
        />
      </View>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <AppButton
          title={loading ? 'Signing Out...' : 'Sign Out'}
          icon="log-out-outline"
          onPress={handleSignOut}
        />
      </View>

      <Text style={styles.footerText}>
        Your profile information is securely stored.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  /* Profile Hero */

  profileCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },

  profileMain: {
    flex: 1,
  },

  profileName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 9,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  /* Sections */

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },

  /* Information Card */

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  infoItem: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  infoContent: {
    flex: 1,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  value: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  userId: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 55,
  },

  editButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 11,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    fontSize: 14,
  },

  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 14,
  },

  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },

  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  saveButton: {
    minWidth: 80,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  saveText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Role Card */

  roleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
  },

  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  roleInfo: {
    flex: 1,
    paddingRight: 10,
  },

  roleCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },

  roleCardDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  /* Sign Out */

  signOutSection: {
    marginTop: 2,
  },

  footerText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 16,
  },
});
