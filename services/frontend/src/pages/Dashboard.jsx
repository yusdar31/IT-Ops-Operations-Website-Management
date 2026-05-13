import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Layers3, Server, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { assetApi, ticketApi } from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatRelativeTime } from '../lib/format';
import { useDensity } from '../lib/uiDensity';

const statCards = [
  { key: 'assetTotal', title: 'Total Assets', icon: Server, tone: 'text-blue-700 bg-blue-50 border-blue-100' },
  { key: 'assetMaintenance', title: 'Maintenance', icon: Layers3, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  { key: 'ticketOpen', title: 'Open Tickets', icon: Ticket, tone: 'text-red-700 bg-red-50 border-red-100' },
  { key: 'ticketProgress', title: 'In Progress', icon: Activity, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
];

function StatCard({ title, value, icon: Icon, tone, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay }}>
      <Card className="overflow-hidden border-slate-200 bg-white">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={`flex h-11 w-11 items-center justify-center rounded-md border ${tone}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <h3 className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</h3>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { compact } = useDensity();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    assetTotal: 0,
    assetMaintenance: 0,
    ticketOpen: 0,
    ticketProgress: 0,
  });
  const [ticketHighlights, setTicketHighlights] = useState([]);
  const [assetDepartments, setAssetDepartments] = useState([]);
  const [ticketCategories, setTicketCategories] = useState([]);

  useEffect(() => {
    let ignore = false;
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const [assetSummary, ticketSummary, recentTickets] = await Promise.all([
          assetApi.get('/assets/summary'),
          ticketApi.get('/tickets/summary'),
          ticketApi.get('/tickets', { params: { limit: 5 } }),
        ]);
        if (ignore) return;
        setStats({
          assetTotal: assetSummary.data.totals.total || 0,
          assetMaintenance: assetSummary.data.totals.maintenance || 0,
          ticketOpen: ticketSummary.data.totals.open || 0,
          ticketProgress: ticketSummary.data.totals.in_progress || 0,
        });
        setAssetDepartments(assetSummary.data.byDept || []);
        setTicketCategories(ticketSummary.data.byCategory || []);
        setTicketHighlights(recentTickets.data.tickets || []);
      } catch {
        if (!ignore) setError('Dashboard belum bisa dimuat. Pastikan semua service API aktif.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className={`${compact ? 'space-y-4' : 'space-y-5'}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Overview</h2>
          <p className="mt-1 text-sm text-slate-600">Ringkasan inventaris dan service desk dari API aktif.</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          {loading ? 'Mengambil metrik terbaru...' : 'Live data sinkron'}
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className={`grid md:grid-cols-2 xl:grid-cols-4 ${compact ? 'gap-3' : 'gap-4'}`}>
        {statCards.map((card, index) => (
          <StatCard key={card.key} title={card.title} value={loading ? '...' : stats[card.key]} icon={card.icon} tone={card.tone} delay={0.04 * (index + 1)} />
        ))}
      </div>

      <div className={`grid xl:grid-cols-[1.3fr_0.7fr] ${compact ? 'gap-4' : 'gap-5'}`}>
        <Card className="border-slate-200 bg-white">
          <CardHeader className={compact ? 'pb-2' : 'pb-4'}>
            <CardTitle className="text-lg text-slate-900">Recent ticket activity</CardTitle>
          </CardHeader>
          <CardContent className={compact ? 'space-y-1.5' : 'space-y-2'}>
            {loading ? (
              <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">Memuat aktivitas tiket...</div>
            ) : ticketHighlights.length ? (
              ticketHighlights.map((ticket) => (
                <div key={ticket.id} className={`rounded-md border border-slate-200 bg-slate-50 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{ticket.ticket_number}</span>
                        <span className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] uppercase text-slate-600">{ticket.priority}</span>
                      </div>
                      <p className="mt-1 font-medium text-slate-900">{ticket.title}</p>
                      <p className="text-sm text-slate-600">Reporter: {ticket.reporter_name || 'Unknown'} - Status: {ticket.status.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <AlertTriangle size={14} />
                      {formatRelativeTime(ticket.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">Belum ada tiket yang bisa ditampilkan.</div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card className="border-slate-200 bg-white">
            <CardHeader className={compact ? 'pb-2' : 'pb-4'}>
              <CardTitle className="text-lg text-slate-900">Assets by department</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Memuat distribusi aset...</div>
              ) : assetDepartments.length ? (
                assetDepartments.map((item) => (
                  <div key={item.department}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.department}</span>
                      <span className="font-medium text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(12, (item.count / Math.max(assetDepartments[0]?.count || 1, 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">Belum ada data departemen.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader className={compact ? 'pb-2' : 'pb-4'}>
              <CardTitle className="text-lg text-slate-900">Ticket categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="text-sm text-slate-500">Memuat kategori tiket...</div>
              ) : ticketCategories.length ? (
                ticketCategories.map((item) => (
                  <div key={item.category} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-700"><CheckCircle2 size={14} /></span>
                      <span className="text-sm capitalize text-slate-700">{item.category.replace('_', ' ')}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">Belum ada kategori tiket.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
