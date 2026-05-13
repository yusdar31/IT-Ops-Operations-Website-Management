import { useEffect, useMemo, useState } from 'react';
import { Clock3, MessageSquare, Plus, Search, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { ticketApi } from '../api/axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ticketCategories, ticketPriorities, ticketStatuses } from '../lib/constants';
import { formatDateTime, formatRelativeTime } from '../lib/format';
import { useDensity } from '../lib/uiDensity';

function priorityClass(priority) {
  const map = {
    critical: 'border-red-200 bg-red-50 text-red-700',
    high: 'border-orange-200 bg-orange-50 text-orange-700',
    medium: 'border-blue-200 bg-blue-50 text-blue-700',
    low: 'border-slate-300 bg-slate-100 text-slate-700',
  };
  return map[priority] || map.low;
}

function statusClass(status) {
  const map = {
    open: 'text-red-700',
    in_progress: 'text-amber-700',
    resolved: 'text-emerald-700',
    closed: 'text-slate-600',
  };
  return map[status] || 'text-slate-700';
}

const initialTicket = {
  title: '',
  description: '',
  category: 'incident',
  priority: 'medium',
};

export default function Tickets() {
  const { compact } = useDensity();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const canUpdateTicket = ['admin', 'technician'].includes(user.role);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialTicket);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function loadTickets() {
    setLoading(true);
    setError('');
    try {
      const response = await ticketApi.get('/tickets', {
        params: { status: statusFilter !== 'all' ? statusFilter : undefined, limit: 50 },
      });
      const loaded = response.data.tickets || [];
      const filtered = searchTerm
        ? loaded.filter((ticket) =>
            [ticket.ticket_number, ticket.title, ticket.reporter_name, ticket.assignee_name]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(searchTerm.toLowerCase()))
          )
        : loaded;
      setTickets(filtered);
    } catch {
      setError('Daftar tiket belum bisa dimuat. Pastikan ticket-api aktif.');
    } finally {
      setLoading(false);
    }
  }

  async function loadTicketDetail(id) {
    setDetailLoading(true);
    setError('');
    try {
      const response = await ticketApi.get(`/tickets/${id}`);
      setTicketDetail(response.data);
    } catch {
      setError('Detail tiket belum bisa dimuat.');
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadTickets, 200);
    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (!selectedTicketId) return;
    loadTicketDetail(selectedTicketId);
  }, [selectedTicketId]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await ticketApi.post('/tickets', form);
      setForm(initialTicket);
      setShowCreate(false);
      setStatusFilter('all');
      await loadTickets();
    } catch (err) {
      setError(err.response?.data?.error || 'Tiket belum berhasil dibuat.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!selectedTicketId || !commentText.trim()) return;
    setCommentSaving(true);
    setError('');
    try {
      await ticketApi.post(`/tickets/${selectedTicketId}/comments`, { content: commentText.trim() });
      setCommentText('');
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (err) {
      setError(err.response?.data?.error || 'Komentar belum berhasil ditambahkan.');
    } finally {
      setCommentSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicketId || !ticketDetail?.ticket || !canUpdateTicket) return;
    setStatusSaving(true);
    setError('');
    try {
      const current = ticketDetail.ticket;
      await ticketApi.put(`/tickets/${selectedTicketId}`, {
        title: current.title,
        description: current.description,
        category: current.category,
        priority: current.priority,
        status: newStatus,
      });
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (err) {
      setError(err.response?.data?.error || 'Status tiket belum berhasil diperbarui.');
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={compact ? 'space-y-4' : 'space-y-5'}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Tickets</h2>
          <p className="text-sm text-slate-600">Queue tiket live dengan detail, komentar, dan update status.</p>
        </div>
        <Button onClick={() => setShowCreate((current) => !current)} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
          <Plus size={16} />
          {showCreate ? 'Close form' : 'Create ticket'}
        </Button>
      </div>

      {showCreate ? (
        <Card className="border-slate-200 bg-white">
          <CardHeader className={compact ? 'pb-2' : ''}><CardTitle className="text-lg text-slate-900">Create ticket</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
              <input className={`auth-input md:col-span-2 ${compact ? 'h-9' : ''}`} placeholder="Judul tiket" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <textarea className={`auth-input md:col-span-2 py-2.5 ${compact ? 'min-h-[90px]' : 'min-h-[120px]'}`} placeholder="Jelaskan masalah atau request" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              <select className={`auth-input ${compact ? 'h-9' : ''}`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {ticketCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select className={`auth-input ${compact ? 'h-9' : ''}`} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {ticketPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">{saving ? 'Saving...' : 'Submit ticket'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className={`grid xl:grid-cols-[1fr_400px] ${compact ? 'gap-4' : 'gap-5'}`}>
        <Card className="border-slate-200 bg-white">
          <CardHeader className={`flex flex-col gap-3 border-b border-slate-200 md:flex-row md:items-center md:justify-between ${compact ? 'pb-2' : 'pb-4'}`}>
            <CardTitle className="text-lg text-slate-900">Ticket queue</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" placeholder="Search tickets" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`auth-input pl-9 ${compact ? 'h-9' : 'h-10'}`} />
              </div>
              <select className={`auth-input min-w-[160px] ${compact ? 'h-9' : 'h-10'}`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error ? <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Memuat ticket queue...</div>
            ) : tickets.length ? (
              <div className="divide-y divide-slate-200">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full px-4 text-left hover:bg-slate-50 ${compact ? 'py-2' : 'py-3'} ${selectedTicketId === ticket.id ? 'bg-blue-50/60' : ''}`}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{ticket.ticket_number}</span>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${priorityClass(ticket.priority)}`}>{ticket.priority}</span>
                          <span className={`text-xs font-medium uppercase ${statusClass(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span>
                        </div>
                        <h3 className="mt-1 text-base font-medium text-slate-900">{ticket.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1"><UserRound size={14} /> {ticket.reporter_name || 'Unknown'}</span>
                          <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {formatRelativeTime(ticket.created_at)}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare size={14} /> Updated {formatDateTime(ticket.updated_at)}</span>
                        </div>
                      </div>
                      <div className="min-w-[200px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        <p>Category: <span className="capitalize text-slate-800">{ticket.category.replace('_', ' ')}</span></p>
                        <p className="mt-1">Assignee: <span className="text-slate-800">{ticket.assignee_name || 'Unassigned'}</span></p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Tidak ada tiket yang cocok dengan filter saat ini.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className={`border-b border-slate-200 ${compact ? 'pb-2' : 'pb-4'}`}>
            <CardTitle className="text-lg text-slate-900">Ticket detail</CardTitle>
          </CardHeader>
          <CardContent className={`space-y-4 ${compact ? 'pt-3' : 'pt-4'}`}>
            {!selectedTicketId ? (
              <div className="rounded-md border border-dashed border-slate-300 px-3 py-7 text-center text-sm text-slate-500">Pilih tiket dari queue untuk membuka detail.</div>
            ) : detailLoading ? (
              <div className="rounded-md border border-dashed border-slate-300 px-3 py-7 text-center text-sm text-slate-500">Memuat detail tiket...</div>
            ) : ticketDetail?.ticket ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{ticketDetail.ticket.ticket_number}</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{ticketDetail.ticket.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{ticketDetail.ticket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">Status: <span className="capitalize">{ticketDetail.ticket.status.replace('_', ' ')}</span></div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">Priority: <span className="capitalize">{ticketDetail.ticket.priority}</span></div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">Category: <span className="capitalize">{ticketDetail.ticket.category.replace('_', ' ')}</span></div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">Reporter: {ticketDetail.ticket.reporter_name || '-'}</div>
                </div>

                {canUpdateTicket ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Update status</p>
                    <div className="flex flex-wrap gap-2">
                      {ticketStatuses.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          disabled={statusSaving || ticketDetail.ticket.status === status}
                          onClick={() => handleStatusChange(status)}
                          variant={ticketDetail.ticket.status === status ? 'secondary' : 'outline'}
                          className="h-8 rounded-md capitalize"
                        >
                          {status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Comments</p>
                  <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                    {ticketDetail.comments?.length ? ticketDetail.comments.map((comment) => (
                      <div key={comment.id} className={`rounded-md border border-slate-200 bg-slate-50 px-3 ${compact ? 'py-1.5' : 'py-2'}`}>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{comment.user_name} ({comment.user_role})</span>
                          <span>{formatDateTime(comment.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{comment.content}</p>
                      </div>
                    )) : (
                      <div className="rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">Belum ada komentar.</div>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="mt-2 space-y-2">
                    <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className={`auth-input py-2.5 ${compact ? 'min-h-[70px]' : 'min-h-[85px]'}`} placeholder="Tambahkan komentar..." required />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={commentSaving} className="bg-blue-600 text-white hover:bg-blue-700">
                        {commentSaving ? 'Saving...' : 'Add comment'}
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 px-3 py-7 text-center text-sm text-slate-500">Detail tiket tidak tersedia.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
