import { useEffect, useMemo, useState } from 'react';
import { Filter, Network, Plus, Search, ServerCog } from 'lucide-react';
import { motion } from 'framer-motion';
import { assetApi } from '../api/axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { assetStatuses, assetTypeOptions } from '../lib/constants';
import { formatDate } from '../lib/format';
import { useDensity } from '../lib/uiDensity';

function StatusBadge({ status }) {
  const map = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    maintenance: 'border-amber-200 bg-amber-50 text-amber-700',
    inactive: 'border-slate-300 bg-slate-100 text-slate-600',
  };
  return <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${map[status] || 'border-slate-300 bg-slate-100 text-slate-600'}`}>{status}</span>;
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
  const { compact } = useDensity();
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
    const timeout = setTimeout(loadAssets, 220);
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={compact ? 'space-y-4' : 'space-y-5'}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Assets</h2>
          <p className="text-sm text-slate-600">Inventaris aktif dari `asset-api` dengan filter status dan pencarian.</p>
        </div>
        {canManageAssets ? (
          <Button onClick={() => setShowCreate((current) => !current)} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <Plus size={16} />
            {showCreate ? 'Close form' : 'Create asset'}
          </Button>
        ) : null}
      </div>

      <div className={`grid md:grid-cols-4 ${compact ? 'gap-3' : 'gap-4'}`}>
        {[
          { label: 'Total', value: totals.total, icon: ServerCog },
          { label: 'Active', value: totals.active, icon: Network },
          { label: 'Maintenance', value: totals.maintenance, icon: Filter },
          { label: 'Inactive', value: totals.inactive, icon: Search },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 bg-white">
            <CardContent className={`flex items-center justify-between ${compact ? 'p-3' : 'p-4'}`}>
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="text-2xl font-semibold text-slate-900">{loading ? '...' : item.value}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                <item.icon size={16} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreate ? (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Create asset</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input className={`auth-input ${compact ? 'h-9' : ''}`} placeholder="Hostname" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} required />
              <input className={`auth-input ${compact ? 'h-9' : ''}`} placeholder="IP address" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} required />
              <select className={`auth-input ${compact ? 'h-9' : ''}`} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {assetTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select className={`auth-input ${compact ? 'h-9' : ''}`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {assetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <input className={`auth-input ${compact ? 'h-9' : ''}`} placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <input className={`auth-input ${compact ? 'h-9' : ''}`} placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <input className={`auth-input md:col-span-2 ${compact ? 'h-9' : ''}`} placeholder="Serial number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
              <div className="md:col-span-2 xl:col-span-4 flex justify-end">
                <Button type="submit" disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">
                  {saving ? 'Saving...' : 'Save asset'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white">
        <CardHeader className={`flex flex-col gap-3 border-b border-slate-200 md:flex-row md:items-center md:justify-between ${compact ? 'pb-2' : 'pb-4'}`}>
          <CardTitle className="text-lg text-slate-900">Asset inventory</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search assets" className={`auth-input pl-9 ${compact ? 'h-9' : 'h-10'}`} />
            </div>
            <select className={`auth-input min-w-[160px] ${compact ? 'h-9' : 'h-10'}`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {assetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className={`px-4 font-medium ${compact ? 'py-2' : 'py-3'}`}>Hostname</th>
                  <th className={`px-4 font-medium ${compact ? 'py-2' : 'py-3'}`}>IP Address</th>
                  <th className={`px-4 font-medium ${compact ? 'py-2' : 'py-3'}`}>Type</th>
                  <th className={`px-4 font-medium ${compact ? 'py-2' : 'py-3'}`}>Department</th>
                  <th className={`px-4 font-medium ${compact ? 'py-2' : 'py-3'}`}>Status</th>
                  <th className={`px-4 font-medium ${compact ? 'py-2' : 'py-3'}`}>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Memuat data aset...</td></tr>
                ) : assets.length ? (
                  assets.map((asset) => (
                    <tr key={asset.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className={`px-4 ${compact ? 'py-2' : 'py-3'}`}>
                        <div className="font-medium text-slate-900">{asset.hostname}</div>
                        <div className="text-xs text-slate-500">{asset.serial_number || 'No serial number'}</div>
                      </td>
                      <td className={`px-4 font-mono text-slate-700 ${compact ? 'py-2' : 'py-3'}`}>{asset.ip_address}</td>
                      <td className={`px-4 text-slate-700 ${compact ? 'py-2' : 'py-3'}`}>{asset.type}</td>
                      <td className={`px-4 text-slate-600 ${compact ? 'py-2' : 'py-3'}`}>{asset.department || '-'}</td>
                      <td className={`px-4 ${compact ? 'py-2' : 'py-3'}`}><StatusBadge status={asset.status} /></td>
                      <td className={`px-4 text-slate-500 ${compact ? 'py-2' : 'py-3'}`}>{formatDate(asset.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Tidak ada aset yang cocok dengan filter saat ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
