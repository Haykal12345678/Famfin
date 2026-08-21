import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { formatRupiah } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay';

// =========================================================
// CONSTANT
// =========================================================

const EMPTY_FORM = {
  name: '',
  targetAmount: '',
  initialAmount: '',
  targetDate: '',
  accountId: '',
  description: '',
};

const EMPTY_CONFIRM = {
  open: false,
  type: null,
  goalId: null,
  title: '',
  message: '',
  confirmText: 'Ya, Lanjutkan',
  variant: 'primary',
};

// =========================================================
// HELPERS
// =========================================================

const formatNumber = (value) => {
  if (!value) return '';

  return Number(
    String(value).replace(/\D/g, '')
  ).toLocaleString('id-ID');
};

const parseNumber = (value) => {
  return Number(
    String(value || '').replace(/\D/g, '')
  );
};

// =========================================================
// GOALS PAGE
// =========================================================

export default function Goals() {
  // =======================================================
  // DATA
  // =======================================================

  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // =======================================================
  // PAGE STATE
  // =======================================================

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  // =======================================================
  // FORM
  // =======================================================

  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });

  // =======================================================
  // SEARCH
  // =======================================================

  const [search, setSearch] = useState('');

  // =======================================================
  // CONTRIBUTE
  // =======================================================

  const [contributeGoal, setContributeGoal] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');

  // =======================================================
  // CONFIRM
  // =======================================================

  const [confirm, setConfirm] = useState({
    ...EMPTY_CONFIRM,
  });

  // =======================================================
  // PROCESSING
  // =======================================================

  const [processing, setProcessing] = useState(false);

  const processingTitle = 'Memproses Data';

  const processingMessage =
    'Sedang memproses perubahan data. Mohon tunggu sebentar...';

  // =======================================================
  // SUCCESS
  // =======================================================

  const [success, setSuccess] = useState({
    open: false,
    title: 'Berhasil',
    message: '',
  });

  // =======================================================
  // ERROR
  // =======================================================

  const [errorModal, setErrorModal] = useState({
    open: false,
    title: 'Terjadi Kesalahan',
    message: '',
  });

  // =======================================================
  // ERROR HANDLER
  // =======================================================

  const openError = (message) => {
    setErrorModal({
      open: true,
      title: 'Terjadi Kesalahan',
      message:
        message ||
        'Terjadi kesalahan saat memproses data.',
    });
  };

  const closeError = () => {
    setErrorModal((prev) => ({
      ...prev,
      open: false,
    }));
  };

  // =======================================================
  // SUCCESS HANDLER
  // =======================================================

  const showSuccess = (message) => {
    setSuccess({
      open: true,
      title: 'Berhasil',
      message,
    });
  };

  const closeSuccess = async () => {
    // -----------------------------------------------------
    // 1. CLOSE SUCCESS POPUP
    // -----------------------------------------------------

    setSuccess((prev) => ({
      ...prev,
      open: false,
    }));

    // -----------------------------------------------------
    // 2. REFRESH BACKGROUND
    // -----------------------------------------------------

    await load(true);
  };

  // =======================================================
  // PROCESSING HANDLER
  // =======================================================

  const showProcessing = () => {
    setProcessing(true);
  };

  const hideProcessing = () => {
    setProcessing(false);
  };

  // =======================================================
  // LOAD DATA
  // =======================================================

  const load = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const [goalRes, accountRes] = await Promise.all([
        api.get('/goals'),
        api.get('/accounts'),
      ]);

      setGoals(
        Array.isArray(goalRes.data)
          ? goalRes.data
          : []
      );

      setAccounts(
        Array.isArray(accountRes.data)
          ? accountRes.data
          : []
      );
    } catch (err) {
      console.error(
        'Failed to load goals:',
        err
      );

      openError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Gagal memuat target tabungan.'
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    load(true);
  }, []);

  // =======================================================
  // FILTER
  // =======================================================

  const filteredGoals = useMemo(() => {
    if (!search.trim()) {
      return goals;
    }

    const keyword = search.toLowerCase();

    return goals.filter((goal) =>
      `${goal.name || ''} ${
        goal.account?.name || ''
      } ${goal.description || ''}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [goals, search]);

  // =======================================================
  // SUMMARY
  // =======================================================

  const summary = useMemo(() => {
    const totalTarget = goals.reduce(
      (total, goal) =>
        total + Number(goal.targetAmount || 0),
      0
    );

    const totalCurrent = goals.reduce(
      (total, goal) =>
        total + Number(goal.currentAmount || 0),
      0
    );

    const completed = goals.filter(
      (goal) =>
        Number(
          goal.progressPercentage || 0
        ) >= 100
    ).length;

    const shortfall = goals.reduce(
      (total, goal) =>
        total + Number(goal.shortfall || 0),
      0
    );

    return {
      totalTarget,
      totalCurrent,
      completed,
      shortfall,
    };
  }, [goals]);

  // =======================================================
  // CREATE
  // =======================================================

  const openCreate = () => {
    setEditingGoal(null);

    setForm({
      ...EMPTY_FORM,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (processing) {
      return;
    }

    setEditingGoal(null);

    setForm({
      ...EMPTY_FORM,
    });

    setShowForm(false);
  };

  // =======================================================
  // SUBMIT FORM
  // =======================================================

  const submit = (event) => {
    event.preventDefault();

    const name = form.name.trim();

    const targetAmount = parseNumber(
      form.targetAmount
    );

    if (!name) {
      openError(
        'Nama target wajib diisi.'
      );
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      openError(
        'Target nominal harus lebih dari Rp 0.'
      );
      return;
    }

    if (!form.accountId) {
      openError(
        'Rekening tujuan wajib dipilih.'
      );
      return;
    }

    if (!form.targetDate) {
      openError(
        'Target tanggal wajib diisi.'
      );
      return;
    }

    // -----------------------------------------------------
    // EDIT
    // -----------------------------------------------------

    if (editingGoal) {
      setConfirm({
        ...EMPTY_CONFIRM,
        open: true,
        type: 'edit',
        title: 'Simpan perubahan?',
        message:
          `Perubahan pada target "${name}" akan disimpan.`,
        confirmText: 'Ya, Simpan',
        variant: 'primary',
      });

      return;
    }

    // -----------------------------------------------------
    // CREATE
    // -----------------------------------------------------

    setConfirm({
      ...EMPTY_CONFIRM,
      open: true,
      type: 'create',
      title: 'Buat target tabungan?',
      message:
        `Target "${name}" akan ditambahkan ke daftar target tabungan.`,
      confirmText: 'Ya, Buat Target',
      variant: 'primary',
    });
  };

  // =======================================================
  // EDIT
  // =======================================================

  const editGoal = (goal) => {
    setEditingGoal(goal);

    setForm({
      name: goal.name || '',
      targetAmount: String(
        goal.targetAmount || ''
      ),
      initialAmount: String(
        goal.initialAmount || ''
      ),
      targetDate: goal.targetDate
        ? goal.targetDate.slice(0, 10)
        : '',
      accountId: goal.accountId || '',
      description: goal.description || '',
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // =======================================================
  // CONTRIBUTE
  // =======================================================

  const openContribute = (goal) => {
    setContributeGoal(goal);
    setContributeAmount('');
  };

  const closeContribute = () => {
    if (processing) {
      return;
    }

    setContributeGoal(null);
    setContributeAmount('');
  };

  const submitContribute = (event) => {
    event.preventDefault();

    if (!contributeGoal) {
      openError(
        'Target tabungan tidak ditemukan.'
      );
      return;
    }

    const amount = parseNumber(
      contributeAmount
    );

    if (!amount || amount <= 0) {
      openError(
        'Nominal tambahan harus lebih dari Rp 0.'
      );
      return;
    }

    setConfirm({
      ...EMPTY_CONFIRM,
      open: true,
      type: 'contribute',
      title: 'Tambah tabungan?',
      message:
        `Dana sebesar ${formatRupiah(
          amount
        )} akan ditambahkan ke target "${contributeGoal.name}".`,
      confirmText: 'Ya, Tambahkan',
      variant: 'primary',
    });
  };

  // =======================================================
  // DELETE
  // =======================================================

  const removeGoal = (goal) => {
    if (!goal?.id) {
      openError(
        'Target yang akan dihapus tidak ditemukan.'
      );
      return;
    }

    setConfirm({
      ...EMPTY_CONFIRM,
      open: true,
      type: 'delete',
      goalId: goal.id,
      title: 'Hapus target?',
      message:
        `Target "${goal.name}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      variant: 'danger',
    });
  };

  // =======================================================
  // CONFIRM RESET
  // =======================================================

  const resetConfirm = () => {
    setConfirm({
      ...EMPTY_CONFIRM,
    });
  };

  // =======================================================
  // CONFIRM ACTION
  // =======================================================

  const handleConfirm = async () => {
    const type = confirm.type;

    if (!type) {
      return;
    }

    const currentConfirm = {
      ...confirm,
    };

    // -----------------------------------------------------
    // CLOSE CONFIRM FIRST
    // -----------------------------------------------------

    resetConfirm();

    // -----------------------------------------------------
    // START PROCESSING
    // LoadingOverlay ON
    // -----------------------------------------------------

    showProcessing();

    try {
      // ===================================================
      // CREATE
      // ===================================================

      if (type === 'create') {
        await api.post('/goals', {
          name: form.name.trim(),
          targetAmount:
            parseNumber(form.targetAmount),
          initialAmount:
            parseNumber(form.initialAmount),
          targetDate: form.targetDate,
          accountId: form.accountId,
          description:
            form.description.trim(),
        });

        // -------------------------------------------------
        // API SUCCESS
        // LoadingOverlay OFF
        // -------------------------------------------------

        hideProcessing();

        // Tutup form sebelum success popup
        closeForm();

        // -------------------------------------------------
        // SUCCESS POPUP
        // -------------------------------------------------

        showSuccess(
          'Target tabungan berhasil dibuat.'
        );

        return;
      }

      // ===================================================
      // EDIT
      // ===================================================

      if (type === 'edit') {
        if (!editingGoal?.id) {
          throw new Error(
            'Target yang akan diedit tidak ditemukan.'
          );
        }

        await api.patch(
          `/goals/${editingGoal.id}`,
          {
            name: form.name.trim(),
            targetAmount:
              parseNumber(
                form.targetAmount
              ),
            targetDate:
              form.targetDate,
            accountId:
              form.accountId,
            description:
              form.description.trim(),
          }
        );

        // -------------------------------------------------
        // API SUCCESS
        // LoadingOverlay OFF
        // -------------------------------------------------

        hideProcessing();

        // Tutup form sebelum success popup
        closeForm();

        // -------------------------------------------------
        // SUCCESS POPUP
        // -------------------------------------------------

        showSuccess(
          'Perubahan target berhasil disimpan.'
        );

        return;
      }

      // ===================================================
      // CONTRIBUTE
      // ===================================================

      if (type === 'contribute') {
        if (!contributeGoal?.id) {
          throw new Error(
            'Target tabungan tidak ditemukan.'
          );
        }

        const amount = parseNumber(
          contributeAmount
        );

        if (!amount || amount <= 0) {
          throw new Error(
            'Nominal tambahan harus lebih dari Rp 0.'
          );
        }

        await api.patch(
          `/goals/${contributeGoal.id}/contribute`,
          {
            amount,
          }
        );

        // -------------------------------------------------
        // API SUCCESS
        // LoadingOverlay OFF
        // -------------------------------------------------

        hideProcessing();

        // Tutup contribute modal sebelum success popup
        closeContribute();

        // -------------------------------------------------
        // SUCCESS POPUP
        // -------------------------------------------------

        showSuccess(
          'Tabungan berhasil ditambahkan.'
        );

        return;
      }

      // ===================================================
      // DELETE
      // ===================================================

      if (type === 'delete') {
        if (!currentConfirm.goalId) {
          throw new Error(
            'Target yang akan dihapus tidak ditemukan.'
          );
        }

        await api.delete(
          `/goals/${currentConfirm.goalId}`
        );

        // -------------------------------------------------
        // API SUCCESS
        // LoadingOverlay OFF
        // -------------------------------------------------

        hideProcessing();

        // -------------------------------------------------
        // SUCCESS POPUP
        // -------------------------------------------------

        showSuccess(
          'Target tabungan berhasil dihapus.'
        );

        return;
      }

      // ===================================================
      // UNKNOWN TYPE
      // ===================================================

      throw new Error(
        'Jenis proses tidak dikenali.'
      );
    } catch (err) {
      console.error(
        'Goal action failed:',
        err
      );

      // -----------------------------------------------------
      // ERROR → LOADING OFF
      // -----------------------------------------------------

      hideProcessing();

      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Gagal memproses data.';

      openError(message);
    }
  };

  // =======================================================
  // CONFIRM CANCEL
  // =======================================================

  const closeConfirm = () => {
    if (processing) {
      return;
    }

    resetConfirm();
  };

  // =======================================================
  // RETURN
  // =======================================================

  return (
    <>
      <div className="space-y-6">

        {/* =================================================
            HEADER
            ================================================= */}

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="relative p-7">

            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-50 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <div className="flex items-center gap-3">

                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      Target Tabungan
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                      Kelola impian finansial keluarga dan pantau progres tabungan.
                    </p>
                  </div>

                </div>
              </div>

              <button
                type="button"
                onClick={
                  showForm
                    ? closeForm
                    : openCreate
                }
                disabled={processing}
                className="
                  rounded-2xl
                  bg-blue-600
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {showForm
                  ? 'Tutup Form'
                  : '+ Buat Target'}
              </button>

            </div>
          </div>
        </section>

        {/* =================================================
            SUMMARY
            ================================================= */}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">

          <SummaryCard
            title="Total Target"
            value={formatRupiah(
              summary.totalTarget
            )}
            icon="🎯"
          />

          <SummaryCard
            title="Terkumpul"
            value={formatRupiah(
              summary.totalCurrent
            )}
            icon="💰"
          />

          <SummaryCard
            title="Kurang"
            value={formatRupiah(
              summary.shortfall
            )}
            icon="📈"
          />

          <SummaryCard
            title="Selesai"
            value={`${summary.completed} Target`}
            icon="🏆"
          />

        </div>

        {/* =================================================
            FORM
            ================================================= */}

        {showForm && (
          <GoalForm
            form={form}
            setForm={setForm}
            accounts={accounts}
            editingGoal={editingGoal}
            processing={processing}
            onSubmit={submit}
            onCancel={closeForm}
          />
        )}

        {/* =================================================
            TOOLBAR
            ================================================= */}

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

              <div className="relative">

                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔎
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Cari target..."
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    py-2.5
                    pl-9
                    pr-9
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
                    onClick={() =>
                      setSearch('')
                    }
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

              <button
                type="button"
                onClick={() =>
                  load(true)
                }
                disabled={
                  loading ||
                  processing
                }
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
                {loading
                  ? 'Memuat...'
                  : '↻ Refresh'}
              </button>

            </div>
          </div>
        </section>

        {/* =================================================
            GOALS
            ================================================= */}

        {loading ? (

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

            {Array.from({
              length: 6,
            }).map((_, index) => (
              <GoalSkeleton
                key={index}
              />
            ))}

          </div>

        ) : filteredGoals.length === 0 ? (

          <EmptyGoals
            search={search}
            onCreate={openCreate}
            onReset={() =>
              setSearch('')
            }
          />

        ) : (

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

            {filteredGoals.map(
              (goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onContribute={
                    openContribute
                  }
                  onEdit={editGoal}
                  onRemove={
                    removeGoal
                  }
                />
              )
            )}

          </div>

        )}

        {/* =================================================
            INSIGHT
            ================================================= */}

        {!loading &&
          goals.length > 0 && (

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
                      ? `Saat ini keluarga sudah mengumpulkan ${formatRupiah(
                          summary.totalCurrent
                        )} dari total target ${formatRupiah(
                          summary.totalTarget
                        )}.`
                      : 'Mulai tambahkan target untuk melihat perkembangan keuangan keluarga.'}
                  </p>

                </div>

              </div>

            </section>

          )}

      </div>

      {/* =====================================================
          CONTRIBUTE MODAL
          ===================================================== */}

      {contributeGoal && (
        <ContributeModal
          goal={contributeGoal}
          amount={contributeAmount}
          setAmount={
            setContributeAmount
          }
          processing={
            processing
          }
          onClose={
            closeContribute
          }
          onSubmit={
            submitContribute
          }
        />
      )}

      {/* =====================================================
          CONFIRM MODAL
          ===================================================== */}

      <ConfirmModal
        open={
          confirm.open &&
          !processing
        }
        title={confirm.title}
        message={confirm.message}
        confirmText={
          confirm.confirmText
        }
        cancelText="Batal"
        onConfirm={
          handleConfirm
        }
        onCancel={
          closeConfirm
        }
        loading={false}
        variant={
          confirm.variant
        }
      />

      {/* =====================================================
          PROCESSING / LOADING OVERLAY
          ===================================================== */}

      <LoadingOverlay
        loading={processing}
        title={processingTitle}
        message={processingMessage}
      />

      {/* =====================================================
          SUCCESS MODAL
          ===================================================== */}

      <SuccessModal
        open={success.open}
        title={success.title}
        message={success.message}
        onClose={
          closeSuccess
        }
      />

      {/* =====================================================
          ERROR MODAL
          ===================================================== */}

      <ErrorModal
        open={errorModal.open}
        title={
          errorModal.title
        }
        message={
          errorModal.message
        }
        onClose={
          closeError
        }
      />
    </>
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
  const current = Number(
    goal.currentAmount || 0
  );

  const target = Number(
    goal.targetAmount || 0
  );

  const percentage = Math.min(
    Number(
      goal.progressPercentage || 0
    ),
    100
  );

  const shortfall = Math.max(
    target - current,
    0
  );

  const isCompleted =
    percentage >= 100;

  const targetDate =
    goal.targetDate
      ? new Date(goal.targetDate)
      : null;

  const formattedDate =
    targetDate
      ? targetDate.toLocaleDateString(
          'id-ID',
          {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }
        )
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
              {isCompleted
                ? '✓'
                : '🎯'}
            </div>

            <div className="min-w-0">

              <h3 className="truncate text-sm font-bold text-slate-900">
                {goal.name}
              </h3>

              <p className="mt-1 truncate text-[11px] text-slate-400">
                {goal.account?.name ||
                  'Tanpa rekening'}
              </p>

            </div>

          </div>

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
            onClick={() =>
              onContribute(goal)
            }
            disabled={isCompleted}
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
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            + Tambah
          </button>

          <button
            type="button"
            onClick={() =>
              onEdit(goal)
            }
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
            onClick={() =>
              onRemove(goal)
            }
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
  processing,
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
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-5 sm:px-7">

        <div className="flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {editingGoal
                ? '✎'
                : '🎯'}
            </div>

            <div>

              <h2 className="text-base font-bold text-slate-900">
                {editingGoal
                  ? 'Edit Target Tabungan'
                  : 'Buat Target Tabungan'}
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {editingGoal
                  ? 'Perbarui informasi target tabungan.'
                  : 'Tentukan tujuan dan rencana tabungan keluarga.'}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
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
              ring-1
              ring-slate-200
              transition
              hover:bg-slate-50
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            ✕
          </button>

        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="p-6 sm:p-7"
      >

        <div className="space-y-7">

          {/* INFORMASI TARGET */}

          <div>

            <div className="mb-4">

              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Informasi Target
              </h3>

              <p className="mt-1 text-[11px] text-slate-400">
                Tentukan nama dan rekening tujuan tabungan.
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="text-xs font-semibold text-slate-600">
                  Nama Target
                </label>

                <input
                  required
                  disabled={processing}
                  value={form.name}
                  onChange={(event) =>
                    update(
                      'name',
                      event.target.value
                    )
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
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                />

              </div>

              <div>

                <label className="text-xs font-semibold text-slate-600">
                  Rekening Tujuan
                </label>

                <select
                  required
                  disabled={processing}
                  value={form.accountId}
                  onChange={(event) =>
                    update(
                      'accountId',
                      event.target.value
                    )
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
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >

                  <option value="">
                    Pilih rekening
                  </option>

                  {accounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                      </option>
                    )
                  )}

                </select>

              </div>

            </div>

          </div>

          {/* RENCANA KEUANGAN */}

          <div>

            <div className="mb-4">

              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Rencana Keuangan
              </h3>

              <p className="mt-1 text-[11px] text-slate-400">
                Tentukan nominal target dan tanggal pencapaiannya.
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <MoneyInput
                label="Target Nominal"
                value={form.targetAmount}
                onChange={(value) =>
                  update(
                    'targetAmount',
                    value
                  )
                }
                placeholder="10.000.000"
                required
                disabled={processing}
              />

              {!editingGoal && (
                <MoneyInput
                  label="Nominal Awal"
                  value={form.initialAmount}
                  onChange={(value) =>
                    update(
                      'initialAmount',
                      value
                    )
                  }
                  placeholder="0"
                  hint="Opsional"
                  disabled={processing}
                />
              )}

              <div>

                <label className="text-xs font-semibold text-slate-600">
                  Target Tanggal
                </label>

                <input
                  type="date"
                  required
                  disabled={processing}
                  value={form.targetDate}
                  onChange={(event) =>
                    update(
                      'targetDate',
                      event.target.value
                    )
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
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                />

              </div>

            </div>

          </div>

          {/* DESCRIPTION */}

          <div>

            <label className="text-xs font-semibold text-slate-600">
              Deskripsi
              <span className="ml-1 font-normal text-slate-400">
                (opsional)
              </span>
            </label>

            <textarea
              rows={3}
              disabled={processing}
              value={form.description}
              onChange={(event) =>
                update(
                  'description',
                  event.target.value
                )
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
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            />

          </div>

          {/* ACTION */}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
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
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={processing}
              className="
                rounded-xl
                bg-blue-600
                px-6
                py-3
                text-xs
                font-bold
                text-white
                shadow-sm
                transition
                hover:bg-blue-700
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {editingGoal
                ? 'Simpan Perubahan'
                : 'Buat Target'}
            </button>

          </div>

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
  disabled = false,
}) {
  const displayValue = value
    ? formatNumber(value)
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
          disabled={disabled}
          value={displayValue}
          onChange={(event) => {
            const numeric =
              event.target.value.replace(
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
            disabled:cursor-not-allowed
            disabled:opacity-60
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
  processing,
  onClose,
  onSubmit,
}) {
  const current = Number(
    goal.currentAmount || 0
  );

  const target = Number(
    goal.targetAmount || 0
  );

  const percentage = Math.min(
    Number(
      goal.progressPercentage || 0
    ),
    100
  );

  const additional = parseNumber(
    amount
  );

  const afterContribution = Math.min(
    current + additional,
    target
  );

  const afterPercentage =
    target > 0
      ? Math.min(
          (afterContribution /
            target) *
            100,
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
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          if (!processing) {
            onClose();
          }
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

        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-white px-6 py-6">

          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">

            <div>

              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-lg">
                💰
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Tambah Tabungan
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Tambahkan dana ke target{' '}
                <span className="font-semibold text-slate-700">
                  {goal.name}
                </span>
              </p>

            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={processing}
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
                ring-1
                ring-slate-200
                transition
                hover:text-slate-700
                disabled:cursor-not-allowed
                disabled:opacity-50
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
                disabled={processing}
                value={
                  amount
                    ? formatNumber(amount)
                    : ''
                }
                onChange={(event) => {
                  const numeric =
                    event.target.value.replace(
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
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              />

            </div>

            <p className="mt-2 text-[10px] text-slate-400">
              Masukkan nominal yang ingin ditambahkan.
            </p>

          </div>

          {additional > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">

              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Setelah ditambahkan
              </p>

              <div className="mt-2 flex items-end justify-between gap-3">

                <div>

                  <p className="text-lg font-bold text-slate-900">
                    {formatRupiah(
                      afterContribution
                    )}
                  </p>

                  <p className="text-[10px] text-slate-500">
                    dari{' '}
                    {formatRupiah(target)}
                  </p>

                </div>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
                  {afterPercentage.toFixed(0)}
                  %
                </span>

              </div>

            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">

            <button
              type="button"
              onClick={onClose}
              disabled={processing}
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
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                processing ||
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
              Tambah Tabungan
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

// =========================================================
// SUCCESS MODAL
// =========================================================

function SuccessModal({
  open,
  title,
  message,
  onClose,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[10000]
        flex
        items-center
        justify-center
        bg-slate-950/40
        px-4
        backdrop-blur-[3px]
      "
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
          ring-1
          ring-black/5
        "
      >

        <div className="p-6 sm:p-7">

          <div className="flex justify-center">

            <div
              className="
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-full
                bg-emerald-50
                text-emerald-600
                ring-8
                ring-emerald-50/60
              "
            >

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12.5l4 4L19 6.5"
                />
              </svg>

            </div>

          </div>

          <div className="mt-5 text-center">

            <h3 className="text-base font-bold text-slate-900">
              {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {message}
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5">

              <span className="flex h-4 w-4 items-center justify-center text-emerald-600">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="h-3 w-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12.5l4 4L19 6.5"
                  />
                </svg>

              </span>

              <span className="text-[11px] font-medium text-emerald-600">
                Perubahan berhasil disimpan
              </span>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              mt-6
              w-full
              rounded-xl
              bg-emerald-600
              px-4
              py-3
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-emerald-700
              active:scale-[0.98]
            "
          >
            Selesai
          </button>

        </div>

        <div className="relative h-1 overflow-hidden bg-emerald-100">

          <div
            className="
              absolute
              inset-y-0
              left-0
              bg-emerald-500
              animate-success-progress
            "
          />

        </div>

      </div>

      <style>
        {`
          @keyframes successProgress {
            from {
              width: 0%;
            }

            to {
              width: 100%;
            }
          }

          .animate-success-progress {
            animation: successProgress 2.5s linear forwards;
          }
        `}
      </style>

    </div>
  );
}

// =========================================================
// ERROR MODAL
// =========================================================

function ErrorModal({
  open,
  title,
  message,
  onClose,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[12000]
        flex
        items-center
        justify-center
        bg-slate-950/40
        px-4
        backdrop-blur-[3px]
      "
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
          ring-1
          ring-black/5
        "
      >

        <div className="p-6 sm:p-7">

          <div className="flex justify-center">

            <div
              className="
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-full
                bg-red-50
                text-red-600
                ring-8
                ring-red-50/60
              "
            >

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>

            </div>

          </div>

          <div className="mt-5 text-center">

            <h3 className="text-base font-bold text-slate-900">
              {title}
            </h3>

            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500">
              {message}
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              mt-6
              w-full
              rounded-xl
              bg-red-600
              px-4
              py-3
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-red-700
              active:scale-[0.98]
            "
          >
            Tutup
          </button>

        </div>

        <div className="h-1 w-full bg-red-500" />

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
            className="
              rounded-xl
              bg-slate-100
              px-4
              py-2.5
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-200
            "
          >
            Reset Pencarian
          </button>

        ) : (

          <button
            type="button"
            onClick={onCreate}
            className="
              rounded-xl
              bg-blue-600
              px-4
              py-2.5
              text-xs
              font-bold
              text-white
              transition
              hover:bg-blue-700
            "
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