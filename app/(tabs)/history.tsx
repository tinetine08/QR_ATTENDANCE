import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<
    TeacherEventAttendance[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRole(null);
      setRecords([]);
      setTeacherEvents([]);
      return;
    }

    setLoading(true);

    try {
      // getProfile() returns ApiResponse<Profile>
      const profileResponse = await getProfile(user.id);

      // The role is inside profileResponse.data
      const currentRole: Role =
        profileResponse.data?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);

        setTeacherEvents(events);
        setRecords([]);
      } else {
        const attendance = await getAttendanceHistory(user.id);

        setRecords(attendance);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('Failed to load attendance history:', error);

      setRecords([]);
      setTeacherEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // -----------------------------------
  // Loading
  // -----------------------------------

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>Loading...</Text>
      </View>
    );
  }

  // -----------------------------------
  // Teacher
  // -----------------------------------

  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Events</Text>

        {teacherEvents.length === 0 ? (
          <Text style={styles.subtitle}>
            No events created yet.
          </Text>
        ) : (
          <FlatList
            data={teacherEvents}
            keyExtractor={(item) => String(item.eventId)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.eventTitle}>
                  {item.title}
                </Text>

                <Text style={styles.eventMeta}>
                  Event Code: {item.eventCode}
                </Text>

                <Text style={styles.eventMeta}>
                  Attendees: {item.attendeeCount}
                </Text>

                {item.attendees.length > 0 && (
                  <View style={styles.attendees}>
                    <Text style={styles.attendeesTitle}>
                      Attendees
                    </Text>

                    {item.attendees.map((attendee, index) => (
                      <View
                        key={`${item.eventId}-${attendee.studentId}-${attendee.scannedAt}-${index}`}
                        style={styles.attendeeRow}
                      >
                        <Text style={styles.eventMeta}>
                          Student: {shortId(attendee.studentId)}
                        </Text>

                        <Text style={styles.eventMeta}>
                          Scanned: {formatDate(attendee.scannedAt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // -----------------------------------
  // Student
  // -----------------------------------

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>

      {records.length === 0 ? (
        <Text style={styles.subtitle}>
          No records yet. Scan a QR code to register your attendance.
        </Text>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>
                {item.eventTitle}
              </Text>

              <Text style={styles.eventMeta}>
                Event Code: {item.eventId}
              </Text>

              <Text style={styles.eventMeta}>
                Attended: {formatDate(item.scannedAt)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

// -----------------------------------
// Helpers
// -----------------------------------

function shortId(id: string) {
  if (!id) {
    return 'unknown';
  }

  return id.length > 8
    ? `…${id.slice(-8)}`
    : id;
}

function formatDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleString();
}

// -----------------------------------
// Styles
// -----------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 32,
  },

  list: {
    paddingBottom: 24,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,

    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,

    elevation: 3,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  eventMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  attendees: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.shadow,
  },

  attendeesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  attendeeRow: {
    marginBottom: 8,
  },
});
