import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminAddTelecallerModal } from '../../components/admin/AdminAddTelecallerModal';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { useAdminTableColumn } from '../../hooks/useAdminTableColumn';
import {
  assignLeadToTelecaller,
  listTelecallerLeads,
  listTelecallers,
  syncTelecallerAssignedCounts,
  UNASSIGNED_TELECALLER_ID,
  isLeadAssignedToTelecaller,
  updateTelecallerLeadStatus,
  type TelecallerLead,
} from '../../services/telecallerService';
import { downloadLeadsPdf, printLeadsTable } from '../../utils/adminLeadsExport';

function leadStatusTone(status: TelecallerLead['status']): 'yellow' | 'orange' | 'green' | 'gray' {
  if (status === 'new') return 'yellow';
  if (status === 'contacted') return 'orange';
  if (status === 'converted') return 'green';
  return 'gray';
}

export function AdminTelecallersScreen() {
  const { pageTitleSize, showMobileHeader, isCompact } = useAdminLayout();
  const col = useAdminTableColumn();
  const c = {
    name: col(1.5, 180),
    phone: col(1, 130),
    status: col(0.9, 100, { alignItems: 'flex-start' }),
    leads: col(0.7, 80),
  };
  const leadCol = {
    name: col(1.5, 180),
    phone: col(1, 130),
    status: col(0.9, 100, { alignItems: 'flex-start' }),
    telecaller: col(1, 130),
  };
  const [telecallers, setTelecallers] = useState<Awaited<ReturnType<typeof listTelecallers>>>([]);
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof listTelecallerLeads>>>([]);
  const [addTelecallerOpen, setAddTelecallerOpen] = useState(false);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [telecallerList, leadList] = await Promise.all([listTelecallers(), listTelecallerLeads()]);
    setLeads(leadList);
    setTelecallers(await syncTelecallerAssignedCounts().catch(() => telecallerList));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const activeTelecallers = telecallers.filter((t) => t.status === 'Active').length;
  const inactiveTelecallers = telecallers.filter((t) => t.status === 'Inactive').length;
  const openLeads = leads.filter((l) => l.status === 'new' || l.status === 'contacted').length;

  const leadExportRows = useMemo(
    () =>
      leads.map((lead) => ({
        name: lead.customerName,
        phone: lead.customerPhone,
        status: lead.status,
        telecaller: isLeadAssignedToTelecaller(lead.telecallerId)
          ? (telecallers.find((t) => t.id === lead.telecallerId)?.name ?? '—')
          : '—',
      })),
    [leads, telecallers],
  );

  const handleLeadsPrint = () => printLeadsTable('Recent Leads', leadExportRows);
  const handleLeadsPdf = () => downloadLeadsPdf('Recent Leads', leadExportRows);

  const telecallerAssignOptions = useMemo(
    () => [
      { id: UNASSIGNED_TELECALLER_ID, label: 'Unassigned' },
      ...telecallers
        .filter((telecaller) => telecaller.status === 'Active')
        .map((telecaller) => ({ id: telecaller.id, label: telecaller.name })),
    ],
    [telecallers],
  );

  const handleAssignTelecaller = async (leadId: string, telecallerId: string) => {
    setAssigningLeadId(leadId);
    try {
      await assignLeadToTelecaller(leadId, telecallerId);
      await refresh();
    } finally {
      setAssigningLeadId(null);
    }
  };

  const handleAdvanceLeadStatus = async (lead: TelecallerLead) => {
    const nextStatus: TelecallerLead['status'] =
      lead.status === 'new' ? 'contacted' : lead.status === 'contacted' ? 'converted' : lead.status;
    if (nextStatus === lead.status) return;
    await updateTelecallerLeadStatus(lead.id, nextStatus);
    await refresh();
  };

  return (
    <AdminPageLayout wide>
      <AdminAddTelecallerModal
        visible={addTelecallerOpen}
        onClose={() => setAddTelecallerOpen(false)}
        onAdded={refresh}
      />

      <View style={[styles.header, isCompact && styles.headerCompact]}>
        {!showMobileHeader ? <Text style={[styles.title, { fontSize: pageTitleSize }]}>Telecallers</Text> : <View />}
        <Pressable style={[styles.addBtn, isCompact && styles.addBtnFull]} onPress={() => setAddTelecallerOpen(true)}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addBtnText}>Add Telecaller</Text>
        </Pressable>
      </View>
      <AdminKpiRow dense>
        <AdminKpiCard compact label="Total Telecallers" value={String(telecallers.length)} icon="people" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard compact label="Active Telecallers" value={String(activeTelecallers)} icon="call" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard compact label="Inactive Telecallers" value={String(inactiveTelecallers)} icon="person-remove" iconBg={colors.redLight} iconColor={colors.red} />
        <AdminKpiCard compact label="Open Leads" value={String(openLeads)} icon="mail-open-outline" iconBg={colors.yellowLight} iconColor={colors.dark} />
      </AdminKpiRow>

      <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Telecallers</Text>
      <AdminTableScroll minWidth={640}>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <View style={c.name}><Text style={styles.th}>Name</Text></View>
            <View style={c.phone}><Text style={styles.th}>Phone</Text></View>
            <View style={c.status}><Text style={styles.th}>Status</Text></View>
            <View style={c.leads}><Text style={styles.th}>Leads</Text></View>
          </View>
          {telecallers.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No telecallers yet. Add one using the button above.</Text>
            </View>
          ) : (
            telecallers.map((row) => (
              <View key={row.id} style={styles.row}>
                <View style={c.name}>
                  <Text style={styles.td} numberOfLines={1}>
                    {row.name}
                  </Text>
                </View>
                <View style={c.phone}>
                  <Text style={styles.td} numberOfLines={1}>
                    {row.phone}
                  </Text>
                </View>
                <View style={c.status}>
                  <Badge label={row.status} tone={row.status === 'Active' ? 'green' : 'gray'} />
                </View>
                <View style={c.leads}>
                  <Text style={styles.td}>{row.assignedLeads}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </AdminTableScroll>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Leads</Text>
        <View style={styles.sectionActions}>
          <Pressable style={styles.actionBtn} onPress={handleLeadsPdf}>
            <Ionicons name="document-outline" size={15} color={colors.orange} />
            <Text style={styles.actionBtnText}>PDF</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleLeadsPrint}>
            <Ionicons name="print-outline" size={15} color={colors.orange} />
            <Text style={styles.actionBtnText}>Print</Text>
          </Pressable>
        </View>
      </View>
      <AdminTableScroll minWidth={640}>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <View style={leadCol.name}><Text style={styles.th}>Name</Text></View>
            <View style={leadCol.phone}><Text style={styles.th}>Phone</Text></View>
            <View style={leadCol.status}><Text style={styles.th}>Status</Text></View>
            <View style={leadCol.telecaller}><Text style={styles.th}>Telecaller</Text></View>
          </View>
          {leads.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No leads yet. Leads appear when customers register.</Text>
            </View>
          ) : (
            leads.map((lead) => {
              const assignedTelecallerId = isLeadAssignedToTelecaller(lead.telecallerId)
                ? lead.telecallerId
                : UNASSIGNED_TELECALLER_ID;
              const inactiveAssigned = telecallers.find(
                (telecaller) => telecaller.id === lead.telecallerId && telecaller.status !== 'Active',
              );
              const assignOptions =
                inactiveAssigned && !telecallerAssignOptions.some((option) => option.id === inactiveAssigned.id)
                  ? [
                      ...telecallerAssignOptions,
                      { id: inactiveAssigned.id, label: `${inactiveAssigned.name} (Inactive)` },
                    ]
                  : telecallerAssignOptions;

              return (
                <View key={lead.id} style={styles.row}>
                  <View style={leadCol.name}>
                    <Text style={styles.td} numberOfLines={1}>
                      {lead.customerName}
                    </Text>
                  </View>
                  <View style={leadCol.phone}>
                    <Text style={styles.td} numberOfLines={1}>
                      {lead.customerPhone}
                    </Text>
                  </View>
                  <View style={leadCol.status}>
                    <Pressable onPress={() => handleAdvanceLeadStatus(lead)}>
                      <Badge label={lead.status} tone={leadStatusTone(lead.status)} />
                    </Pressable>
                  </View>
                  <View style={leadCol.telecaller}>
                    <AdminFilterSelect
                      value={assignedTelecallerId}
                      options={assignOptions}
                      onChange={(telecallerId) => {
                        if (assigningLeadId) return;
                        void handleAssignTelecaller(lead.id, telecallerId);
                      }}
                      minWidth={130}
                      flex
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </AdminTableScroll>
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
  headerCompact: { flexDirection: 'column', alignItems: 'stretch' },
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
  addBtnFull: { justifyContent: 'center', width: '100%' },
  addBtnText: { fontSize: 13, fontWeight: '800', color: colors.onPrimary },
  table: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  th: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  td: { fontSize: 13, color: colors.text, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionTitleSpaced: { marginTop: spacing.lg, marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.orange },
  emptyRow: { paddingVertical: 32, alignItems: 'center', paddingHorizontal: spacing.md },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
