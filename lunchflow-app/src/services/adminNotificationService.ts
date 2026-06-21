import { AdminPage } from '../components/AdminSidebar';
import { buildSalaryReport } from './reportsService';
import { listAllOrdersToday } from './orderHubService';
import { loadRegisteredDrivers } from './userRegistryService';

export type AdminNotification = {
  id: string;
  icon: 'cube' | 'wallet' | 'bicycle' | 'people' | 'alert-circle';
  title: string;
  msg: string;
  page?: AdminPage;
};

export async function buildAdminNotifications(): Promise<AdminNotification[]> {
  const [orders, salaryReport, drivers] = await Promise.all([
    listAllOrdersToday(),
    buildSalaryReport(),
    loadRegisteredDrivers(),
  ]);

  const notifications: AdminNotification[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((order) => order.date === today || order.date.startsWith(today));

  const unassigned = todayOrders.filter(
    (order) => !order.driver && order.status !== 'delivered' && order.status !== 'pickup_closed',
  );
  if (unassigned.length > 0) {
    notifications.push({
      id: 'unassigned-orders',
      icon: 'cube',
      title: `${unassigned.length} unassigned order${unassigned.length > 1 ? 's' : ''}`,
      msg: 'Assign drivers from the Orders page.',
      page: 'orders',
    });
  }

  const live = todayOrders.filter(
    (order) => order.status === 'in_transit' || order.status === 'picked_up' || order.status === 'at_drop',
  );
  if (live.length > 0) {
    notifications.push({
      id: 'live-deliveries',
      icon: 'bicycle',
      title: `${live.length} live deliver${live.length > 1 ? 'ies' : 'y'}`,
      msg: 'Deliveries currently in progress.',
      page: 'orders',
    });
  }

  if (salaryReport.unpaid > 0) {
    notifications.push({
      id: 'unpaid-salary',
      icon: 'wallet',
      title: 'Pending salary payments',
      msg: `₹${salaryReport.unpaid.toLocaleString('en-IN')} unpaid this month.`,
      page: 'salary',
    });
  }

  const availableDrivers = drivers.filter((driver) => driver.status === 'Available');
  if (availableDrivers.length === 0 && drivers.length > 0 && unassigned.length > 0) {
    notifications.push({
      id: 'no-drivers',
      icon: 'alert-circle',
      title: 'No available drivers',
      msg: 'All drivers are busy or off duty.',
      page: 'drivers',
    });
  }

  const pendingOrders = todayOrders.filter(
    (order) => order.status !== 'delivered' && order.status !== 'pickup_closed' && order.status !== 'booked',
  );
  if (pendingOrders.length > 0 && !notifications.some((n) => n.id === 'unassigned-orders')) {
    notifications.push({
      id: 'pending-orders',
      icon: 'cube',
      title: `${pendingOrders.length} pending order${pendingOrders.length > 1 ? 's' : ''}`,
      msg: 'Orders still awaiting completion.',
      page: 'orders',
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      id: 'all-clear',
      icon: 'people',
      title: 'All caught up',
      msg: 'No urgent alerts right now.',
    });
  }

  return notifications.slice(0, 6);
}
