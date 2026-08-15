import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';

const EMPTY_FORM = {
  name: '',
  targetAmount: '',
  initialAmount: '',
  targetDate: '',
  accountId: '',
  description: '',
};

const formatNumber = (value) => {
  if (!value) return '';
  return Number(String(value).replace(/\D/g, '')).toLocaleString('id-ID');
};

const parseNumber = (value) => {
  return Number(String(value || '').replace(/\D/g, ''));
};

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Modal tambah tabungan
  const [contributeGoal, setContributeGoal] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeSaving, setContributeSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  // ========================= LOAD =========================

  const load = async () => {
    try {
      setLoading(true);

      const [goalRes, accountRes] = await Promise.all([
        api.get('/goals'),
        api.get('/accounts'),
      ]);

      setGoals(goalRes.data || []);
      setAccounts(accountRes.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal memuat target tabungan.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ========================= FILTER =========================

  const filteredGoals = useMemo(() => {
    if (!search.trim()) return goals;

    const keyword = search.toLowerCase();

    return goals.filter((g) =>
      `${g.name} ${g.account?.name || ''} ${g.description || ''}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [goals, search]);

  // ========================= SUMMARY =========================

  const summary = useMemo(() => {
    const totalTarget = goals.reduce(
      (a, b) => a + Number(b.targetAmount || 0),
      0
    );

    const totalCurrent = goals.reduce(
      (a, b) => a + Number(b.currentAmount || 0),
      0
    );

    const completed = goals.filter(
      (g) => Number(g.progressPercentage) >= 100
    ).length;

    const shortfall = goals.reduce(
      (a, b) => a + Number(b.shortfall || 0),
      0
    );

    return {
      totalTarget,
      totalCurrent,
      completed,
      shortfall,
    };
  }, [goals]);

  // ========================= FORM =========================

  const openCreate = () => {
    setEditingGoal(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingGoal(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(false);
  };

  const submit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError('');

    try {
      if (editingGoal) {
        await api.patch(`/goals/${editingGoal.id}`, {
          name: form.name,
          targetAmount: parseNumber(form.targetAmount),
          targetDate: form.targetDate,
          accountId: form.accountId,
          description: form.description,
        });
      } else {
        await api.post('/goals', {
          ...form,
          targetAmount: parseNumber(form.targetAmount),
          initialAmount: parseNumber(form.initialAmount),
        });
      }

      closeForm();
      load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal menyimpan target.'
      );
    } finally {
      setSaving(false);
    }
  };

  const editGoal = (goal) => {
    setEditingGoal(goal);

    setForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      initialAmount: String(goal.initialAmount || ''),
      targetDate: goal.targetDate.slice(0, 10),
      accountId: goal.accountId,
      description: goal.description || '',
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const removeGoal = async (id) => {
    if (!window.confirm('Hapus target ini?')) return;

    try {
      await api.delete(`/goals/${id}`);
      load();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          'Gagal menghapus target.'
      );
    }
  };

  // ========================= MODAL TABUNGAN =========================

  const openContribute = (goal) => {
    setContributeGoal(goal);
    setContributeAmount('');
  };

  const closeContribute = () => {
    if (contributeSaving) return;
    setContributeGoal(null);
    setContributeAmount('');
  };

  const submitContribute = async (e) => {
    e.preventDefault();

    const amount = parseNumber(contributeAmount);

    if (!amount) return;

    try {
      setContributeSaving(true);

      await api.patch(
        `/goals/${contributeGoal.id}/contribute`,
        { amount }
      );

      closeContribute();
      load();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          'Gagal menambah tabungan.'
      );
    } finally {
      setContributeSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ================= HEADER ================= */}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

        <div className="relative p-7">

          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-50 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Target Tabungan
              </h1>

              <p className="mt-2 max-w-xl text-sm text-slate-500">
                Kelola impian finansial keluarga dan pantau progres tabungan secara real-time.
              </p>

            </div>

            <button
              onClick={
                showForm ? closeForm : openCreate
              }
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              {showForm
                ? 'Tutup Form'
                : '+ Buat Target'}
            </button>

          </div>

        </div>

      </section>

      {/* ================= SUMMARY ================= */}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">

        <SummaryCard
          title="Total Target"
          value={formatRupiah(summary.totalTarget)}
          icon="🎯"
        />

        <SummaryCard
          title="Terkumpul"
          value={formatRupiah(summary.totalCurrent)}
          icon="💰"
        />

        <SummaryCard
          title="Kurang"
          value={formatRupiah(summary.shortfall)}
          icon="📈"
        />

        <SummaryCard
          title="Selesai"
          value={`${summary.completed} Target`}
          icon="🏆"
        />

      </div>

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {showForm && (
        <GoalForm
          form={form}
          setForm={setForm}
          accounts={accounts}
          editingGoal={editingGoal}
          saving={saving}
          error={error}
          onSubmit={submit}
          onCancel={closeForm}
        />
      )}
            {/* ================= SEARCH & TOOLBAR ================= */}

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Daftar Target
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {goals.length} target tersimpan
            </p>
          </div>


          <div className="flex flex-col gap-2 sm:flex-row">

            {/* SEARCH */}

            <div className="relative">

              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari target..."
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  py-2.5
                  pl-9
                  pr-4
                  text-xs
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-50
                  sm:w-64
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-xs
                    text-slate-400
                    hover:text-slate-700
                  "
                >
                  ✕
                </button>
              )}

            </div>


            {/* REFRESH */}

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-2.5
                text-xs
                font-semibold
                text-slate-600
                transition
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-600
                disabled:opacity-50
              "
            >
              {loading ? 'Memuat...' : '↻ Refresh'}
            </button>

          </div>

        </div>

      </section>


      {/* ================= GOALS GRID ================= */}

      {loading ? (

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

          {Array.from({ length: 6 }).map((_, index) => (
            <GoalSkeleton key={index} />
          ))}

        </div>

      ) : filteredGoals.length === 0 ? (

        <EmptyGoals
          search={search}
          onCreate={openCreate}
          onReset={() => setSearch('')}
        />

      ) : (

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

          {filteredGoals.map((goal) => (

            <GoalCard
              key={goal.id}
              goal={goal}
              onContribute={openContribute}
              onEdit={editGoal}
              onRemove={removeGoal}
            />

          ))}

        </div>

      )}


      {/* ================= QUICK INSIGHT ================= */}

      {!loading && goals.length > 0 && (

        <section className="rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50/80 to-white p-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg">
              💡
            </div>

            <div>

              <p className="text-sm font-bold text-slate-800">
                Insight Tabungan
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">

                {summary.totalTarget > 0
                  ? `Saat ini keluarga sudah mengumpulkan ${formatRupiah(summary.totalCurrent)} dari total target ${formatRupiah(summary.totalTarget)}.`
                  : 'Mulai tambahkan target untuk melihat perkembangan keuangan keluarga.'}

              </p>

            </div>

          </div>

        </section>

      )}


      {/* ================= CONTRIBUTE MODAL ================= */}

      {contributeGoal && (

        <ContributeModal
          goal={contributeGoal}
          amount={contributeAmount}
          setAmount={setContributeAmount}
          saving={contributeSaving}
          onClose={closeContribute}
          onSubmit={submitContribute}
        />

      )}

    </div>
  );
}


// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  title,
  value,
  icon,
}) {
  return (
    <div
      className="
        group
        rounded-[22px]
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {value}
          </p>

        </div>


        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-slate-50
            text-base
            transition
            group-hover:scale-105
          "
        >
          {icon}
        </div>

      </div>

    </div>
  );
}


// =========================================================
// GOAL CARD
// =========================================================

function GoalCard({
  goal,
  onContribute,
  onEdit,
  onRemove,
}) {
  const current = Number(goal.currentAmount || 0);
  const target = Number(goal.targetAmount || 0);

  const percentage = Math.min(
    Number(goal.progressPercentage || 0),
    100
  );

  const shortfall = Math.max(
    target - current,
    0
  );

  const isCompleted = percentage >= 100;

  const targetDate = goal.targetDate
    ? new Date(goal.targetDate)
    : null;

  const formattedDate = targetDate
    ? targetDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-';

  return (
    <article
      className="
        group
        overflow-hidden
        rounded-[24px]
        border
        border-slate-200
        bg-white
        shadow-sm
        transition
        duration-200
        hover:-translate-y-1
        hover:shadow-lg
      "
    >

      {/* TOP ACCENT */}

      <div
        className={`h-1 ${
          isCompleted
            ? 'bg-emerald-500'
            : percentage >= 70
              ? 'bg-blue-500'
              : 'bg-slate-200'
        }`}
      />


      <div className="p-5">

        {/* HEADER */}

        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <div
              className={`
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                text-sm
                font-bold
                ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-blue-50 text-blue-600'
                }
              `}
            >
              {isCompleted ? '✓' : '🎯'}
            </div>


            <div className="min-w-0">

              <h3 className="truncate text-sm font-bold text-slate-900">
                {goal.name}
              </h3>

              <p className="mt-1 truncate text-[11px] text-slate-400">
                {goal.account?.name || 'Tanpa rekening'}
              </p>

            </div>

          </div>


          {/* STATUS */}

          <span
            className={`
              shrink-0
              rounded-full
              px-2.5
              py-1
              text-[10px]
              font-bold
              ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-blue-50 text-blue-700'
              }
            `}
          >
            {isCompleted
              ? 'Selesai'
              : `${percentage}%`}
          </span>

        </div>


        {/* PROGRESS */}

        <div className="mt-6">

          <div className="mb-2 flex items-center justify-between">

            <span className="text-[11px] font-medium text-slate-400">
              Progress
            </span>

            <span className="text-[11px] font-bold text-slate-600">
              {percentage}%
            </span>

          </div>


          <div className="h-2 overflow-hidden rounded-full bg-slate-100">

            <div
              className={`
                h-full
                rounded-full
                transition-all
                duration-500
                ${
                  isCompleted
                    ? 'bg-emerald-500'
                    : percentage >= 70
                      ? 'bg-blue-500'
                      : 'bg-blue-400'
                }
              `}
              style={{
                width: `${percentage}%`,
              }}
            />

          </div>

        </div>


        {/* AMOUNT */}

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">

          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Terkumpul
          </p>

          <div className="mt-1 flex flex-wrap items-baseline gap-1">

            <span className="text-lg font-bold tracking-tight text-slate-900">
              {formatRupiah(current)}
            </span>

            <span className="text-[11px] text-slate-400">
              / {formatRupiah(target)}
            </span>

          </div>

        </div>


        {/* INFO */}

        <div className="mt-4 space-y-2">

          <div className="flex items-center justify-between gap-3">

            <span className="text-[11px] text-slate-400">
              Target tanggal
            </span>

            <span className="text-[11px] font-semibold text-slate-600">
              {formattedDate}
            </span>

          </div>


          <div className="flex items-center justify-between gap-3">

            <span className="text-[11px] text-slate-400">
              Sisa target
            </span>

            <span
              className={`
                text-[11px]
                font-bold
                ${
                  isCompleted
                    ? 'text-emerald-600'
                    : 'text-slate-700'
                }
              `}
            >
              {isCompleted
                ? 'Target tercapai'
                : formatRupiah(shortfall)}
            </span>

          </div>

        </div>


        {/* ACTIONS */}

        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">

          <button
            type="button"
            onClick={() => onContribute(goal)}
            className="
              flex-1
              rounded-xl
              bg-emerald-50
              px-3
              py-2.5
              text-[11px]
              font-bold
              text-emerald-700
              transition
              hover:bg-emerald-100
            "
          >
            + Tambah
          </button>


          <button
            type="button"
            onClick={() => onEdit(goal)}
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-[11px]
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
            "
          >
            Edit
          </button>


          <button
            type="button"
            onClick={() => onRemove(goal.id)}
            className="
              rounded-xl
              border
              border-red-100
              bg-red-50
              px-4
              py-2.5
              text-[11px]
              font-semibold
              text-red-600
              transition
              hover:bg-red-100
            "
          >
            Hapus
          </button>

        </div>

      </div>

    </article>
  );
}
// =========================================================
// GOAL FORM
// =========================================================

function GoalForm({
  form,
  setForm,
  accounts,
  editingGoal,
  saving,
  error,
  onSubmit,
  onCancel,
}) {
  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

      {/* FORM HEADER */}

      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

        <div>
          <h2 className="text-base font-bold text-slate-900">
            {editingGoal
              ? 'Edit Target Tabungan'
              : 'Buat Target Tabungan'}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Tentukan target dan pantau progresnya.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>

      </div>


      <form
        onSubmit={onSubmit}
        className="grid gap-5 p-6 lg:grid-cols-2"
      >

        {/* NAMA */}

        <div>
          <label className="text-xs font-semibold text-slate-600">
            Nama Target
          </label>

          <input
            required
            value={form.name}
            onChange={(e) =>
              update('name', e.target.value)
            }
            placeholder="Contoh: Dana Pendidikan Anak"
            className="
              mt-2
              w-full
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-900
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-blue-400
              focus:bg-white
              focus:ring-4
              focus:ring-blue-50
            "
          />
        </div>


        {/* REKENING */}

        <div>
          <label className="text-xs font-semibold text-slate-600">
            Rekening Tujuan
          </label>

          <select
            required
            value={form.accountId}
            onChange={(e) =>
              update('accountId', e.target.value)
            }
            className="
              mt-2
              w-full
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-900
              outline-none
              transition
              focus:border-blue-400
              focus:bg-white
              focus:ring-4
              focus:ring-blue-50
            "
          >
            <option value="">
              Pilih rekening
            </option>

            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
              </option>
            ))}
          </select>
        </div>


        {/* TARGET */}

        <MoneyInput
          label="Target Nominal"
          value={form.targetAmount}
          onChange={(value) =>
            update('targetAmount', value)
          }
          placeholder="10.000.000"
          required
        />


        {/* INITIAL */}

        {!editingGoal && (
          <MoneyInput
            label="Nominal Awal"
            value={form.initialAmount}
            onChange={(value) =>
              update('initialAmount', value)
            }
            placeholder="0"
            hint="Opsional"
          />
        )}


        {/* DATE */}

        <div>
          <label className="text-xs font-semibold text-slate-600">
            Target Tanggal
          </label>

          <input
            type="date"
            required
            value={form.targetDate}
            onChange={(e) =>
              update('targetDate', e.target.value)
            }
            className="
              mt-2
              w-full
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-900
              outline-none
              transition
              focus:border-blue-400
              focus:bg-white
              focus:ring-4
              focus:ring-blue-50
            "
          />
        </div>


        {/* DESCRIPTION */}

        <div className="lg:col-span-2">

          <label className="text-xs font-semibold text-slate-600">
            Deskripsi
            <span className="ml-1 font-normal text-slate-400">
              (opsional)
            </span>
          </label>

          <textarea
            rows={3}
            value={form.description}
            onChange={(e) =>
              update('description', e.target.value)
            }
            placeholder="Tambahkan catatan untuk target ini..."
            className="
              mt-2
              w-full
              resize-none
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-900
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-blue-400
              focus:bg-white
              focus:ring-4
              focus:ring-blue-50
            "
          />

        </div>


        {/* ERROR */}

        {error && (
          <div className="lg:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
            {error}
          </div>
        )}


        {/* ACTION */}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end lg:col-span-2">

          <button
            type="button"
            onClick={onCancel}
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              px-5
              py-3
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
            "
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving}
            className="
              rounded-xl
              bg-blue-600
              px-5
              py-3
              text-xs
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {saving
              ? 'Menyimpan...'
              : editingGoal
                ? 'Simpan Perubahan'
                : 'Buat Target'}
          </button>

        </div>

      </form>

    </section>
  );
}


// =========================================================
// MONEY INPUT
// =========================================================

function MoneyInput({
  label,
  value,
  onChange,
  placeholder = '0',
  required = false,
  hint,
}) {
  const displayValue = value
    ? Number(
        String(value).replace(/\D/g, '')
      ).toLocaleString('id-ID')
    : '';

  return (
    <div>

      <div className="flex items-center justify-between">

        <label className="text-xs font-semibold text-slate-600">
          {label}
        </label>

        {hint && (
          <span className="text-[10px] text-slate-400">
            {hint}
          </span>
        )}

      </div>

      <div className="relative mt-2">

        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          Rp
        </span>

        <input
          type="text"
          inputMode="numeric"
          required={required}
          value={displayValue}
          onChange={(e) => {
            const numeric = e.target.value.replace(
              /\D/g,
              ''
            );

            onChange(numeric);
          }}
          placeholder={placeholder}
          className="
            w-full
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            py-3
            pl-11
            pr-4
            text-sm
            font-semibold
            text-slate-900
            outline-none
            transition
            placeholder:font-normal
            placeholder:text-slate-400
            focus:border-blue-400
            focus:bg-white
            focus:ring-4
            focus:ring-blue-50
          "
        />

      </div>

    </div>
  );
}


// =========================================================
// CONTRIBUTE MODAL
// =========================================================

function ContributeModal({
  goal,
  amount,
  setAmount,
  saving,
  onClose,
  onSubmit,
}) {
  const current = Number(goal.currentAmount || 0);
  const target = Number(goal.targetAmount || 0);

  const percentage = Math.min(
    Number(goal.progressPercentage || 0),
    100
  );

  const additional = Number(
    String(amount || '').replace(/\D/g, '')
  );

  const afterContribution = Math.min(
    current + additional,
    target
  );

  const afterPercentage =
    target > 0
      ? Math.min(
          (afterContribution / target) * 100,
          100
        )
      : 0;

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-slate-950/40
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >

      <div
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-[28px]
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
      >

        {/* MODAL HEADER */}

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-white px-6 py-6">

          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">

            <div>

              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-lg">
                💰
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Tambah Tabungan
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Tambahkan dana ke target{' '}
                <span className="font-semibold text-slate-700">
                  {goal.name}
                </span>
              </p>

            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-white
                text-sm
                text-slate-400
                shadow-sm
                transition
                hover:text-slate-700
              "
            >
              ✕
            </button>

          </div>

        </div>


        <form
          onSubmit={onSubmit}
          className="space-y-5 p-6"
        >

          {/* CURRENT PROGRESS */}

          <div className="rounded-2xl bg-slate-50 p-4">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Saat ini
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatRupiah(current)}
                </p>

              </div>

              <div className="text-right">

                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Target
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatRupiah(target)}
                </p>

              </div>

            </div>


            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">

              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                }}
              />

            </div>

            <div className="mt-2 flex justify-between">

              <span className="text-[10px] text-slate-400">
                Progress
              </span>

              <span className="text-[10px] font-bold text-emerald-600">
                {percentage}%
              </span>

            </div>

          </div>


          {/* INPUT NOMINAL */}

          <div>

            <label className="text-xs font-semibold text-slate-600">
              Nominal Tambahan
            </label>

            <div className="relative mt-2">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Rp
              </span>

              <input
                autoFocus
                required
                type="text"
                inputMode="numeric"
                value={
                  amount
                    ? Number(
                        String(amount).replace(/\D/g, '')
                      ).toLocaleString('id-ID')
                    : ''
                }
                onChange={(e) => {
                  const numeric =
                    e.target.value.replace(
                      /\D/g,
                      ''
                    );

                  setAmount(numeric);
                }}
                placeholder="0"
                className="
                  w-full
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  py-4
                  pl-11
                  pr-4
                  text-lg
                  font-bold
                  text-slate-900
                  outline-none
                  transition
                  placeholder:font-normal
                  placeholder:text-slate-300
                  focus:border-emerald-400
                  focus:ring-4
                  focus:ring-emerald-50
                "
              />

            </div>

            <p className="mt-2 text-[10px] text-slate-400">
              Masukkan nominal tanpa titik atau simbol Rp.
            </p>

          </div>


          {/* PREVIEW */}

          {additional > 0 && (

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">

              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Setelah ditambahkan
              </p>

              <div className="mt-2 flex items-end justify-between gap-3">

                <div>

                  <p className="text-lg font-bold text-slate-900">
                    {formatRupiah(afterContribution)}
                  </p>

                  <p className="text-[10px] text-slate-500">
                    dari {formatRupiah(target)}
                  </p>

                </div>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
                  {afterPercentage.toFixed(0)}%
                </span>

              </div>

            </div>

          )}


          {/* ACTION */}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="
                flex-1
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-3
                text-xs
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:opacity-50
              "
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !additional ||
                additional <= 0
              }
              className="
                flex-1
                rounded-xl
                bg-emerald-600
                px-4
                py-3
                text-xs
                font-bold
                text-white
                shadow-sm
                transition
                hover:bg-emerald-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {saving
                ? 'Menyimpan...'
                : 'Tambah Tabungan'}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


// =========================================================
// EMPTY STATE
// =========================================================

function EmptyGoals({
  search,
  onCreate,
  onReset,
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-2xl">
        {search ? '🔎' : '🎯'}
      </div>

      <h3 className="mt-5 text-sm font-bold text-slate-900">
        {search
          ? 'Target tidak ditemukan'
          : 'Belum ada target tabungan'}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-400">
        {search
          ? `Tidak ada target yang cocok dengan "${search}".`
          : 'Buat target tabungan pertama untuk mulai merencanakan tujuan finansial keluarga.'}
      </p>

      <div className="mt-5">

        {search ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            Reset Pencarian
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
          >
            + Buat Target
          </button>
        )}

      </div>

    </div>
  );
}


// =========================================================
// SKELETON
// =========================================================

function GoalSkeleton() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="h-11 w-11 animate-pulse rounded-2xl bg-slate-100" />

        <div className="flex-1 space-y-2">

          <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />

          <div className="h-2 w-24 animate-pulse rounded bg-slate-100" />

        </div>

      </div>


      <div className="mt-6 h-2 animate-pulse rounded-full bg-slate-100" />

      <div className="mt-5 h-20 animate-pulse rounded-2xl bg-slate-100" />

      <div className="mt-4 space-y-3">

        <div className="h-2 w-full animate-pulse rounded bg-slate-100" />

        <div className="h-2 w-3/4 animate-pulse rounded bg-slate-100" />

      </div>


      <div className="mt-5 flex gap-2">

        <div className="h-9 flex-1 animate-pulse rounded-xl bg-slate-100" />

        <div className="h-9 w-16 animate-pulse rounded-xl bg-slate-100" />

        <div className="h-9 w-16 animate-pulse rounded-xl bg-slate-100" />

      </div>

    </div>
  );
}