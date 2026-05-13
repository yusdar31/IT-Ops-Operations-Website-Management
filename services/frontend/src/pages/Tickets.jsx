import { useEffect, useMemo, useState } from 'react';
import { Clock3, MessageSquare, Plus, Search, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { ticketApi } from '../api/axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ticketCategories, ticketPriorities, ticketStatuses } from '../lib/constants';
import { formatDateTime, formatRelativeTime } from '../lib/format';

function priorityClass(priority) {
  const map = {
    critical: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
    high: 'border-orange-400/30 bg-orange-400/10 text-orange-100',
    medium: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
    low: 'border-white/10 bg-white/5 text-slate-300',
  };
  return map[priority] || map.low;
}

function statusClass(status) {
  const map = {
    open: 'text-rose-200',
    in_progress: 'text-amber-100',
    resolved: 'text-emerald-200',
    closed: 'text-slate-400',
  };
  return map[status] || 'text-slate-300';
}

const initialTicket = {
  title: '',
  description: '',
  category: 'incident',
  priority: 'medium',
};

export default function Tickets() {
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
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 50,
        },
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
    const timeout = setTimeout(() => {
      loadTickets();
    }, 200);
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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-white">Service desk</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Ticket queue live dari `ticket-api`, lengkap dengan detail, komentar, dan update status.
          </p>
        </div>
        <Button onClick={() => setShowCreate((current) => !current)} className="gap-2 rounded-2xl bg-amber-300 text-slate-950 hover:bg-amber-200">
          <Plus size={16} />
          {showCreate ? 'Tutup form tiket' : 'New ticket'}
        </Button>
      </div>

      {showCreate ? (
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Create ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <input className="auth-input md:col-span-2" placeholder="Judul tiket" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <textarea className="auth-input min-h-[140px] md:col-span-2 py-4" placeholder="Jelaskan masalah atau request dengan konteks yang cukup" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              <select className="auth-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {ticketCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select className="auth-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {ticketPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={saving} className="rounded-2xl bg-amber-300 text-slate-950 hover:bg-amber-200">
                  {saving ? 'Menyimpan...' : 'Submit ticket'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl text-white">Ticket queue</CardTitle>
              <p className="mt-2 text-sm text-slate-400">
                Masuk sebagai <span className="font-medium text-slate-200">{user.role || 'viewer'}</span>. Klik tiket untuk melihat detail.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search tickets"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="auth-input h-12 pl-11"
                />
              </div>
              <select className="auth-input h-12 min-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error ? <div className="border-b border-rose-400/20 bg-rose-400/10 px-6 py-4 text-sm text-rose-100">{error}</div> : null}
            {loading ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">Memuat ticket queue...</div>
            ) : tickets.length ? (
              <div className="divide-y divide-white/5">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full px-6 py-5 text-left transition hover:bg-white/[0.02] ${selectedTicketId === ticket.id ? 'bg-white/[0.03]' : ''}`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                            {ticket.ticket_number}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${priorityClass(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                          <span className={`text-xs font-semibold uppercase tracking-[0.22em] ${statusClass(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-white">{ticket.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <UserRound size={15} />
                            {ticket.reporter_name || 'Unknown reporter'}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Clock3 size={15} />
                            {formatRelativeTime(ticket.created_at)}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <MessageSquare size={15} />
                            Updated {formatDateTime(ticket.updated_at)}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-[220px] rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-400">
                        <p>Category: <span className="capitalize text-slate-200">{ticket.category.replace('_', ' ')}</span></p>
                        <p className="mt-2">Assignee: <span className="text-slate-200">{ticket.assignee_name || 'Unassigned'}</span></p>
                        <p className="mt-2">Reporter: <span className="text-slate-200">{ticket.reporter_name || '-'}</span></p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center text-sm text-slate-500">Tidak ada tiket yang cocok dengan filter saat ini.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-xl text-white">Ticket detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {!selectedTicketId ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                Pilih tiket dari queue untuk membuka detail.
              </div>
            ) : detailLoading ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                Memuat detail tiket...
              </div>
            ) : ticketDetail?.ticket ? (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">{ticketDetail.ticket.ticket_number}</p>
                  <h3 className="text-xl font-semibold text-white">{ticketDetail.ticket.title}</h3>
                  <p className="text-sm leading-6 text-slate-400">{ticketDetail.ticket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-slate-300">Status: <span className="capitalize">{ticketDetail.ticket.status.replace('_', ' ')}</span></div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-slate-300">Priority: <span className="capitalize">{ticketDetail.ticket.priority}</span></div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-slate-300">Category: <span className="capitalize">{ticketDetail.ticket.category.replace('_', ' ')}</span></div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-slate-300">Reporter: {ticketDetail.ticket.reporter_name || '-'}</div>
                </div>

                {canUpdateTicket ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Update status</p>
                    <div className="flex flex-wrap gap-2">
                      {ticketStatuses.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          disabled={statusSaving || ticketDetail.ticket.status === status}
                          onClick={() => handleStatusChange(status)}
                          variant={ticketDetail.ticket.status === status ? 'secondary' : 'outline'}
                          className="h-9 rounded-xl capitalize"
                        >
                          {status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Comments</p>
                  <div className="max-h-[260px] space-y-2 overflow-auto pr-1">
                    {ticketDetail.comments?.length ? ticketDetail.comments.map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{comment.user_name} ({comment.user_role})</span>
                          <span>{formatDateTime(comment.created_at)}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{comment.content}</p>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
                        Belum ada komentar.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="auth-input min-h-[90px] py-3"
                      placeholder="Tambahkan komentar terbaru..."
                      required
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={commentSaving} className="rounded-xl bg-amber-300 text-slate-950 hover:bg-amber-200">
                        {commentSaving ? 'Menyimpan...' : 'Tambah komentar'}
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                Detail tiket tidak tersedia.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
