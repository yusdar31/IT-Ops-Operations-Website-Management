import { useEffect, useMemo, useState } from 'react';
import { Filter, Network, Plus, Search, ServerCog } from 'lucide-react';
import { motion } from 'framer-motion';
import { assetApi } from '../api/axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { assetStatuses, assetTypeOptions } from '../lib/constants';
import { formatDate } from '../lib/format';

function StatusBadge({ status }) {
  const map = {
    active: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    maintenance: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    inactive: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${map[status] || 'border-white/10 bg-white/5 text-slate-300'}`}>
      {status}
    </span>
  );
}

const initialForm = {
  hostname: '',
  ip_address: '',
  type: 'Server Linux',
  department: '',
  location: '',
  status: 'active',
  serial_number: '',
};

export default function Assets() {
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const canManageAssets = ['admin', 'technician'].includes(user.role);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);

  async function loadAssets() {
    setLoading(true);
    setError('');
    try {
      const response = await assetApi.get('/assets', {
        params: {
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 50,
        },
      });
      setAssets(response.data.assets || []);
    } catch {
      setError('Data aset belum bisa dimuat. Pastikan asset-api aktif.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadAssets();
    }, 220);

    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter]);

  const totals = useMemo(() => {
    return assets.reduce(
      (acc, asset) => {
        acc.total += 1;
        acc[asset.status] = (acc[asset.status] || 0) + 1;
        return acc;
      },
      { total: 0, active: 0, maintenance: 0, inactive: 0 }
    );
  }, [assets]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await assetApi.post('/assets', form);
      setForm(initialForm);
      setShowCreate(false);
      await loadAssets();
    } catch (err) {
      setError(err.response?.data?.error || 'Aset belum berhasil dibuat.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-white">Asset registry</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Inventaris aktif langsung dari `asset-api`, dengan filter cepat untuk status dan pencarian hostname atau IP.
          </p>
        </div>
        {canManageAssets ? (
          <Button onClick={() => setShowCreate((current) => !current)} className="gap-2 rounded-2xl bg-amber-300 text-slate-950 hover:bg-amber-200">
            <Plus size={16} />
            {showCreate ? 'Tutup form asset' : 'Tambah asset'}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: totals.total, icon: ServerCog },
          { label: 'Active', value: totals.active, icon: Network },
          { label: 'Maintenance', value: totals.maintenance, icon: Filter },
          { label: 'Inactive', value: totals.inactive, icon: Search },
        ].map((item) => (
          <Card key={item.label} className="border-white/10 bg-white/[0.03]">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-1 text-3xl font-semibold text-white">{loading ? '...' : item.value}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-amber-200">
                <item.icon size={18} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreate ? (
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Create asset</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input className="auth-input" placeholder="Hostname" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} required />
              <input className="auth-input" placeholder="IP address" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} required />
              <select className="auth-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {assetTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select className="auth-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {assetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <input className="auth-input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <input className="auth-input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <input className="auth-input md:col-span-2" placeholder="Serial number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
              <div className="md:col-span-2 xl:col-span-4 flex justify-end">
                <Button type="submit" disabled={saving} className="rounded-2xl bg-amber-300 text-slate-950 hover:bg-amber-200">
                  {saving ? 'Menyimpan...' : 'Simpan asset'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-white/[0.03]">
        <CardHeader className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl text-white">Infrastructure inventory</CardTitle>
            <p className="mt-2 text-sm text-slate-400">Cari berdasarkan hostname, IP, atau serial number.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[260px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search assets"
                className="auth-input h-12 pl-11"
              />
            </div>
            <select className="auth-input h-12 min-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {assetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? <div className="border-b border-rose-400/20 bg-rose-400/10 px-6 py-4 text-sm text-rose-100">{error}</div> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-6 py-4 font-medium">Hostname</th>
                  <th className="px-6 py-4 font-medium">IP Address</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">Memuat data aset...</td>
                  </tr>
                ) : assets.length ? (
                  assets.map((asset) => (
                    <tr key={asset.id} className="border-t border-white/5 transition hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{asset.hostname}</div>
                        <div className="mt-1 text-xs text-slate-500">{asset.serial_number || 'No serial number'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">{asset.ip_address}</td>
                      <td className="px-6 py-4 text-slate-300">{asset.type}</td>
                      <td className="px-6 py-4 text-slate-400">{asset.department || '-'}</td>
                      <td className="px-6 py-4"><StatusBadge status={asset.status} /></td>
                      <td className="px-6 py-4 text-slate-500">{formatDate(asset.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">Tidak ada aset yang cocok dengan filter saat ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
