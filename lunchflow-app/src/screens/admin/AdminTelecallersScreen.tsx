import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminAddTelecallerModal } from '../../components/admin/AdminAddTelecallerModal';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { listTelecallerLeads, listTelecallers, saveTelecallerLead } from '../../services/telecallerService';

export function AdminTelecallersScreen() {
  const { pageTitleSize, showMobileHeader } = useAdminLayout();
  const [telecallers, setTelecallers] = useState<Awaited<ReturnType<typeof listTelecallers>>>([]);
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof listTelecallerLeads>>>([]);
  const [addTelecallerOpen, setAddTelecallerOpen] = useState(false);

  const refresh = useCallback(async () => {
    setTelecallers(await listTelecallers());
    setLeads(await listTelecallerLeads());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const activeTelecallers = telecallers.filter((t) => t.status === 'Active').length;
  const inactiveTelecallers = telecallers.filter((t) => t.status === 'Inactive').length;

  return (
    <AdminPageLayout wide>
      <AdminAddTelecallerModal
        visible={addTelecallerOpen}
        onClose={() => setAddTelecallerOpen(false)}
        onAdded={refresh}
      />

      <View style={styles.header}>
        {!showMobileHeader ? <Text style={[styles.title, { fontSize: pageTitleSize }]}>Telecallers</Text> : <View />}
        <Pressable style={styles.addBtn} onPress={() => setAddTelecallerOpen(true)}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addBtnText}>Add Telecaller</Text>
        </Pressable>
      </View>
      <AdminKpiRow dense>
        <AdminKpiCard compact label="Total Telecallers" value={String(telecallers.length)} icon="people" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard compact label="Active Telecallers" value={String(activeTelecallers)} icon="call" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard compact label="Inactive Telecallers" value={String(inactiveTelecallers)} icon="person-remove" iconBg={colors.redLight} iconColor={colors.red} />
      </AdminKpiRow>

      <AdminTableScroll>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.th}>Name</Text>
            <Text style={styles.th}>Phone</Text>
            <Text style={styles.th}>Status</Text>
            <Text style={styles.th}>Leads</Text>
          </View>
          {telecallers.map((row) => (
            <View key={row.id} style={styles.row}>
              <Text style={styles.td}>{row.name}</Text>
              <Text style={styles.td}>{row.phone}</Text>
              <Badge label={row.status} tone={row.status === 'Active' ? 'green' : 'gray'} />
              <Text style={styles.td}>{row.assignedLeads}</Text>
            </View>
          ))}
        </View>
      </AdminTableScroll>

      <Text style={styles.sectionTitle}>Recent Leads</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {leads.slice(0, 10).map((lead) => (
          <Pressable
            key={lead.id}
            style={styles.leadCard}
            onPress={async () => {
              await saveTelecallerLead({ ...lead, status: lead.status === 'new' ? 'contacted' : 'converted' });
              await refresh();
            }}
          >
            <Text style={styles.leadName}>{lead.customerName}</Text>
            <Text style={styles.leadSub}>{lead.customerPhone}</Text>
            <Badge label={lead.status} tone="orange" />
          </Pressable>
        ))}
      </ScrollView>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.lg,
  },
  title: { fontWeight: '800', color: colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.orange,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    height: 40,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: colors.onPrimary },
  table: { minWidth: 640, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  headerRow: { flexDirection: 'row', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  th: { flex: 1, fontSize: 12, fontWeight: '800', color: colors.muted },
  td: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginVertical: spacing.md, color: colors.text },
  leadCard: { width: 180, marginRight: 10, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, gap: 6 },
  leadName: { fontWeight: '700', color: colors.text },
  leadSub: { fontSize: 12, color: colors.muted },
});
