import { useEffect, useState } from 'react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import LoadingOverlay from '../components/LoadingOverlay';
import ConfirmModal from '../components/ConfirmModal';

const ROLE_LABEL = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const STATUS_LABEL = {
  ACTIVE: 'Aktif',
  PENDING: 'Menunggu',
  INACTIVE: 'Nonaktif',
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'MEMBER',
};

// =========================================================
// PASSWORD GENERATOR
// =========================================================

function generatePassword() {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

  let pass = '';

  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }

  return pass;
}

// =========================================================
// HELPERS
// =========================================================

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function getRoleStyle(role) {
  const styles = {
    OWNER:
      'bg-violet-50 text-violet-700 border-violet-100',
    ADMIN:
      'bg-blue-50 text-blue-700 border-blue-100',
    MEMBER:
      'bg-emerald-50 text-emerald-700 border-emerald-100',
    VIEWER:
      'bg-slate-100 text-slate-600 border-slate-200',
  };

  return styles[role] || styles.MEMBER;
}

function getStatusStyle(status) {
  const styles = {
    ACTIVE:
      'bg-emerald-50 text-emerald-700 border-emerald-100',
    PENDING:
      'bg-amber-50 text-amber-700 border-amber-100',
    INACTIVE:
      'bg-slate-100 text-slate-500 border-slate-200',
  };

  return styles[status] || styles.INACTIVE;
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Members() {
  const [members, setMembers] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // =======================================================
  // FORM
  // =======================================================

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    password: generatePassword(),
  });

  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // =======================================================
  // PAGE LOADING
  // =======================================================

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =======================================================
  // PROCESSING
  // =======================================================

  const [processing, setProcessing] = useState(false);

  const processingTitle = 'Memproses Data';

  const processingMessage =
    'Sedang memproses perubahan data. Mohon tunggu sebentar...';

  const [currentAction, setCurrentAction] = useState('');

  // =======================================================
  // SEARCH
  // =======================================================

  const [search, setSearch] = useState('');

  // =======================================================
  // CONFIRM MODAL
  // =======================================================

  const [showConfirm, setShowConfirm] = useState(false);

  const [confirmData, setConfirmData] = useState({
    title: '',
    message: '',
    type: '',
    member: null,
    role: '',
  });

  // =======================================================
  // SUCCESS POPUP
  // =======================================================

  const [showSuccess, setShowSuccess] = useState(false);

  const [successData, setSuccessData] = useState({
    title: 'Berhasil',
    message: '',
    shouldRefresh: false,
    createdInfo: null,
  });

  // =======================================================
  // ERROR POPUP
  // =======================================================

  const [showErrorPopup, setShowErrorPopup] = useState(false);

  const [errorData, setErrorData] = useState({
    title: 'Gagal',
    message: '',
  });

  // =======================================================
  // CREATED ACCOUNT
  // =======================================================

  const [createdInfo, setCreatedInfo] = useState(null);

  // =======================================================
  // LOAD MEMBERS
  // =======================================================

  const load = async (
    requestedPage = page,
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get('/members', {
        params: {
          page: requestedPage,
          pageSize,
        },
      });

      setMembers(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || requestedPage);
    } catch (err) {
      console.error(
        'Gagal memuat anggota:',
        err
      );

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Gagal memuat data anggota.';

      setErrorData({
        title: 'Gagal Memuat Anggota',
        message,
      });

      setShowErrorPopup(true);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  // =======================================================
  // PROCESSING HELPERS
  // =======================================================

  const startProcessing = (action) => {
    setCurrentAction(action);
    setProcessing(true);
  };

  const resetProcessing = () => {
    setProcessing(false);
    setCurrentAction('');
  };

  // =======================================================
  // SUCCESS
  // =======================================================

  const showActionSuccess = (
    title,
    message,
    shouldRefresh = true,
    createdInfo = null
  ) => {
    setSuccessData({
      title,
      message,
      shouldRefresh,
      createdInfo,
    });

    setShowSuccess(true);
  };

  const closeSuccess = () => {
    setShowSuccess(false);

    if (successData.createdInfo) {
      setCreatedInfo(successData.createdInfo);
    }

    if (successData.shouldRefresh) {
      load(page, true);
    }
  };

  // =======================================================
  // ERROR
  // =======================================================

  const showActionError = (
    title,
    message
  ) => {
    setErrorData({
      title: title || 'Gagal',
      message:
        message ||
        'Terjadi kesalahan saat memproses data.',
    });

    setShowErrorPopup(true);
  };

  // =======================================================
  // ERROR TITLE
  // =======================================================

  const getErrorTitle = (err) => {
    const status = err?.response?.status;

    if (status === 400) {
      return 'Data Tidak Valid';
    }

    if (status === 401) {
      return 'Tidak Terautentikasi';
    }

    if (status === 403) {
      return 'Akses Ditolak';
    }

    if (status === 404) {
      return 'Data Tidak Ditemukan';
    }

    if (status === 409) {
      return 'Data Duplikat';
    }

    if (status === 422) {
      return 'Validasi Gagal';
    }

    if (status >= 500) {
      return 'Server Bermasalah';
    }

    return 'Gagal Memproses Data';
  };

  // =======================================================
  // RESET FORM
  // =======================================================

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      password: generatePassword(),
    });

    setShowPassword(false);
  };

  // =======================================================
  // TOGGLE FORM
  // =======================================================

  const toggleForm = () => {
    if (processing) {
      return;
    }

    if (showForm) {
      resetForm();
      setShowForm(false);
      return;
    }

    resetForm();
    setShowForm(true);
  };

  // =======================================================
  // REGENERATE PASSWORD
  // =======================================================

  const regeneratePassword = () => {
    if (processing) {
      return;
    }

    setForm({
      ...form,
      password: generatePassword(),
    });

    setShowPassword(false);
  };

  // =======================================================
  // SUBMIT CREATE MEMBER
  // =======================================================

  const submit = (e) => {
    e.preventDefault();

    if (processing) {
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password.trim();

    if (!name) {
      showActionError(
        'Data Belum Lengkap',
        'Nama anggota wajib diisi.'
      );

      return;
    }

    if (!email) {
      showActionError(
        'Data Belum Lengkap',
        'Email anggota wajib diisi.'
      );

      return;
    }

    if (!password) {
      showActionError(
        'Data Belum Lengkap',
        'Password awal wajib diisi.'
      );

      return;
    }

    if (password.length < 8) {
      showActionError(
        'Password Tidak Valid',
        'Password awal minimal 8 karakter.'
      );

      return;
    }

    setConfirmData({
      title: 'Tambah Anggota?',
      message: `Apakah kamu yakin ingin menambahkan "${name}" sebagai ${ROLE_LABEL[form.role] || form.role}?`,
      type: 'CREATE',
      member: {
        name,
        email,
        password,
        role: form.role,
      },
      role: form.role,
    });

    setShowConfirm(true);
  };

  // =======================================================
  // CONFIRM SUBMIT
  // =======================================================

  const confirmSubmit = async () => {
    if (
      !confirmData?.type ||
      processing
    ) {
      return;
    }

    const type = confirmData.type;
    const member = confirmData.member;
    const role = confirmData.role;

    setShowConfirm(false);

    startProcessing(type);

    try {
      // =====================================================
      // CREATE
      // =====================================================

      if (type === 'CREATE') {
        const { data } =
          await api.post(
            '/members',
            {
              name: member.name,
              email: member.email,
              password: member.password,
              role: member.role,
            }
          );

        const created = {
          name:
            data?.user?.name ||
            member.name,

          email:
            data?.user?.email ||
            member.email,

          password:
            data?.temporaryPassword ||
            member.password,
        };

        resetForm();
        setShowForm(false);

        resetProcessing();

        showActionSuccess(
          'Berhasil',
          `Anggota "${created.name}" berhasil ditambahkan sebagai ${ROLE_LABEL[member.role] || member.role}.`,
          true,
          created
        );

        return;
      }

      // =====================================================
      // UPDATE ROLE
      // =====================================================

      if (type === 'UPDATE_ROLE') {
        await api.patch(
          `/members/${member.membershipId}/role`,
          {
            role,
          }
        );

        resetProcessing();

        showActionSuccess(
          'Berhasil',
          `Role "${member.user?.name || 'anggota ini'}" berhasil diperbarui menjadi ${ROLE_LABEL[role] || role}.`,
          true
        );

        return;
      }

      // =====================================================
      // DELETE
      // =====================================================

      if (type === 'DELETE') {
        await api.delete(
          `/members/${member.membershipId}`
        );

        resetProcessing();

        showActionSuccess(
          'Berhasil',
          `Anggota "${member.user?.name || 'anggota ini'}" berhasil dikeluarkan dari keluarga.`,
          true
        );

        return;
      }

      resetProcessing();
    } catch (err) {
      console.error(
        'Member action error:',
        err
      );

      resetProcessing();

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Gagal memproses data anggota.';

      showActionError(
        getErrorTitle(err),
        message
      );
    }
  };

  // =======================================================
  // UPDATE ROLE
  // =======================================================

  const updateRole = (
    member,
    newRole
  ) => {
    if (processing) {
      return;
    }

    if (
      !member ||
      member.role === newRole
    ) {
      return;
    }

    setConfirmData({
      title: 'Perbarui Role?',
      message: `Apakah kamu yakin ingin mengubah role "${member.user?.name || 'anggota ini'}" dari ${ROLE_LABEL[member.role] || member.role} menjadi ${ROLE_LABEL[newRole] || newRole}?`,
      type: 'UPDATE_ROLE',
      member,
      role: newRole,
    });

    setShowConfirm(true);
  };

  // =======================================================
  // REMOVE MEMBER
  // =======================================================

  const remove = (member) => {
    if (processing) {
      return;
    }

    if (!member) {
      return;
    }

    setConfirmData({
      title: 'Keluarkan Anggota?',
      message: `Apakah kamu yakin ingin mengeluarkan "${member.user?.name || 'anggota ini'}" dari keluarga? Anggota tersebut tidak lagi memiliki akses ke keluarga ini.`,
      type: 'DELETE',
      member,
      role: '',
    });

    setShowConfirm(true);
  };

  // =======================================================
  // FILTER SEARCH
  // =======================================================

  const filteredMembers =
    members.filter((member) => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return true;
      }

      const name =
        member.user?.name
          ?.toLowerCase() || '';

      const email =
        member.user?.email
          ?.toLowerCase() || '';

      const role =
        ROLE_LABEL[
          member.role
        ]?.toLowerCase() || '';

      const status =
        STATUS_LABEL[
          member.status
        ]?.toLowerCase() || '';

      return (
        name.includes(keyword) ||
        email.includes(keyword) ||
        role.includes(keyword) ||
        status.includes(keyword)
      );
    });

  // =======================================================
  // MEMBER COUNTERS
  // =======================================================

  const activeCount =
    members.filter(
      (member) =>
        member.status === 'ACTIVE'
    ).length;

  const pendingCount =
    members.filter(
      (member) =>
        member.status === 'PENDING'
    ).length;

  const adminCount =
    members.filter(
      (member) =>
        member.role === 'ADMIN' ||
        member.role === 'OWNER'
    ).length;

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="relative space-y-6">

      {/* =====================================================
          PROCESSING OVERLAY
      ===================================================== */}

      <LoadingOverlay
        loading={processing}
        title={processingTitle}
        message={processingMessage}
      />

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

        <div className="relative p-6 sm:p-7">

          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-50 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-24 right-20 h-40 w-40 rounded-full bg-violet-50 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Anggota Keluarga
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Kelola anggota, role, dan akses keluarga.
              </p>

            </div>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  load(page, true)
                }
                disabled={
                  refreshing ||
                  processing
                }
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-blue-200
                  bg-blue-50
                  px-4
                  py-3
                  text-sm
                  font-semibold
                  text-blue-600
                  transition
                  hover:bg-blue-100
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {refreshing
                  ? 'Memuat...'
                  : 'Refresh'}
              </button>

              <button
                type="button"
                onClick={toggleForm}
                disabled={processing}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-blue-600
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                  hover:shadow-md
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <span className="text-lg leading-none">
                  {showForm
                    ? '×'
                    : '+'}
                </span>

                {showForm
                  ? 'Tutup Form'
                  : 'Tambah Anggota'}
              </button>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          MEMBER SUMMARY
      ===================================================== */}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

        <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCardItem
            label="Total Anggota"
            value={total}
            description="Seluruh anggota keluarga"
            type="total"
          />

          <SummaryCardItem
            label="Aktif"
            value={activeCount}
            description="Status aktif di halaman"
            type="active"
          />

          <SummaryCardItem
            label="Menunggu"
            value={pendingCount}
            description="Menunggu aktivasi"
            type="pending"
          />

          <SummaryCardItem
            label="Admin & Owner"
            value={adminCount}
            description="Pengguna dengan akses admin"
            type="admin"
          />

        </div>

        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-2">

              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 12 4 4L19 6"
                  />
                </svg>

              </div>

              <div>

                <p className="text-xs font-semibold text-slate-700">
                  Akses keluarga terkelola
                </p>

                <p className="text-[10px] text-slate-400">
                  Role dan status anggota dapat diperbarui dari daftar anggota.
                </p>

              </div>

            </div>

            <div className="text-left sm:text-right">

              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Ditampilkan
              </p>

              <p className="mt-0.5 text-xs font-bold text-slate-700">
                {members.length} dari {total} anggota
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          CREATED ACCOUNT
      ===================================================== */}

      {createdInfo && (
        <CreatedAccountCard
          createdInfo={createdInfo}
          onClose={() =>
            setCreatedInfo(null)
          }
        />
      )}

      {/* =====================================================
          CREATE MEMBER FORM
      ===================================================== */}

      {showForm && (
        <MemberForm
          form={form}
          setForm={setForm}
          submit={submit}
          saving={processing}
          showPassword={showPassword}
          setShowPassword={
            setShowPassword
          }
          regeneratePassword={
            regeneratePassword
          }
          onCancel={() => {
            resetForm();
            setShowForm(false);
          }}
        />
      )}

      {/* =====================================================
          MEMBER LIST
      ===================================================== */}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 p-5 sm:p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h2 className="text-base font-bold text-slate-900">
                Daftar Anggota
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Kelola role dan status anggota keluarga.
              </p>

            </div>

            <div className="flex w-full items-center gap-3 lg:w-auto">

              <div className="relative w-full lg:w-80">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path
                    strokeLinecap="round"
                    d="m20 20-4-4"
                  />
                </svg>

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Cari nama atau email..."
                  disabled={processing}
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    py-3
                    pl-10
                    pr-4
                    text-xs
                    text-slate-800
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

            </div>

          </div>

        </div>

        {/* ===================================================
            DESKTOP TABLE
        =================================================== */}

        <div className="hidden overflow-x-auto md:block">

          <table className="w-full min-w-[760px] text-sm">

            <thead>

              <tr className="border-b border-slate-100 bg-slate-50/70 text-left">

                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Anggota
                </th>

                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Email
                </th>

                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Role
                </th>

                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Status
                </th>

                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Aksi
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (
                <MemberTableSkeleton />
              ) : filteredMembers.length === 0 ? (
                <EmptyMembers
                  search={search}
                />
              ) : (
                filteredMembers.map(
                  (member) => (
                    <MemberRow
                      key={
                        member.membershipId
                      }
                      member={member}
                      updateRole={
                        updateRole
                      }
                      remove={remove}
                      processing={
                        processing
                      }
                    />
                  )
                )
              )}

            </tbody>

          </table>

        </div>

        {/* ===================================================
            MOBILE CARDS
        =================================================== */}

        <div className="space-y-3 p-4 md:hidden">

          {loading ? (
            <MemberMobileSkeleton />
          ) : filteredMembers.length === 0 ? (
            <EmptyMembersMobile
              search={search}
            />
          ) : (
            filteredMembers.map(
              (member) => (
                <MemberMobileCard
                  key={
                    member.membershipId
                  }
                  member={member}
                  updateRole={
                    updateRole
                  }
                  remove={remove}
                  processing={
                    processing
                  }
                />
              )
            )
          )}

        </div>

        {/* ===================================================
            PAGINATION
        =================================================== */}

        {!loading &&
          filteredMembers.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-4 sm:px-6">

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                className="mt-0"
              />

            </div>
          )}

      </section>

      {/* =====================================================
          INFO ROLE
      ===================================================== */}

      <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-5">

        <div className="flex gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
            i
          </div>

          <div>

            <p className="text-sm font-semibold text-blue-900">
              Tentang Role Anggota
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Admin dapat membantu mengelola sistem keluarga.
              Member dapat mengelola transaksi sesuai akses rekening
              yang diberikan. Viewer hanya dapat melihat data yang
              diizinkan.
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          CONFIRM MODAL
      ===================================================== */}

      <ConfirmModal
        open={showConfirm}
        title={confirmData.title}
        message={confirmData.message}
        confirmText={
          confirmData.type === 'DELETE'
            ? 'Ya, Keluarkan'
            : 'Ya, Lanjutkan'
        }
        cancelText="Batal"
        onConfirm={confirmSubmit}
        onCancel={() => {
          if (processing) {
            return;
          }

          setShowConfirm(false);
        }}
        loading={processing}
        variant={
          confirmData.type === 'DELETE'
            ? 'danger'
            : 'primary'
        }
      />

      {/* =====================================================
          SUCCESS POPUP
      ===================================================== */}

      {showSuccess && (
        <SuccessPopup
          title={successData.title}
          message={successData.message}
          onClose={closeSuccess}
        />
      )}

      {/* =====================================================
          ERROR POPUP
      ===================================================== */}

      {showErrorPopup && (
        <ErrorPopup
          title={errorData.title}
          message={errorData.message}
          onClose={() =>
            setShowErrorPopup(false)
          }
        />
      )}

    </div>
  );
}

// =========================================================
// SUMMARY CARD ITEM
// =========================================================

function SummaryCardItem({
  label,
  value,
  description,
  type,
}) {
  const config = {
    total: {
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      valueText: 'text-slate-900',

      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          />

          <circle
            cx="9"
            cy="7"
            r="4"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M22 21v-2a4 4 0 0 0-3-3.87"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 3.13a4 4 0 0 1 0 7.75"
          />
        </svg>
      ),
    },

    active: {
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      valueText: 'text-emerald-700',

      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m5 12 4 4L19 6"
          />
        </svg>
      ),
    },

    pending: {
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-600',
      valueText: 'text-amber-700',

      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 7v5l3 2"
          />
        </svg>
      ),
    },

    admin: {
      iconBg: 'bg-violet-50',
      iconText: 'text-violet-600',
      valueText: 'text-violet-700',

      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9 12 2 2 4-4"
          />
        </svg>
      ),
    },
  };

  const style =
    config[type] || config.total;

  return (
    <div className="bg-white p-5 transition hover:bg-slate-50/50 sm:p-6">

      <div className="flex items-start justify-between gap-4">

        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-2xl
            ${style.iconBg}
            ${style.iconText}
          `}
        >
          {style.icon}
        </div>

        <div
          className={`
            text-2xl
            font-bold
            tracking-tight
            ${style.valueText}
          `}
        >
          {value}
        </div>

      </div>

      <div className="mt-4">

        <p className="text-sm font-bold text-slate-800">
          {label}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-slate-400">
          {description}
        </p>

      </div>

    </div>
  );
}

// =========================================================
// MEMBER ROW
// =========================================================

function MemberRow({
  member,
  updateRole,
  remove,
  processing,
}) {
  const isOwner =
    member.role === 'OWNER';

  return (
    <tr className="border-b border-slate-50 transition hover:bg-slate-50/70 last:border-0">

      <td className="px-6 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
            {getInitials(
              member.user?.name || '?'
            )}
          </div>

          <div className="min-w-0">

            <p className="truncate font-semibold text-slate-800">
              {member.user?.name || '-'}
            </p>

            {isOwner && (
              <span className="mt-1 inline-flex rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Pemilik Keluarga
              </span>
            )}

          </div>

        </div>

      </td>

      <td className="px-4 py-4">

        <span className="text-slate-500">
          {member.user?.email || '-'}
        </span>

      </td>

      <td className="px-4 py-4">

        {isOwner ? (
          <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            Owner
          </span>
        ) : (
          <select
            disabled={processing}
            className={`
              rounded-xl
              border
              px-3
              py-2
              text-xs
              font-semibold
              outline-none
              transition
              disabled:cursor-not-allowed
              disabled:opacity-50
              ${getRoleStyle(
                member.role
              )}
            `}
            value={member.role}
            onChange={(e) =>
              updateRole(
                member,
                e.target.value
              )
            }
          >

            {Object.entries(
              ROLE_LABEL
            )
              .filter(
                ([key]) =>
                  key !== 'OWNER'
              )
              .map(
                ([key, label]) => (
                  <option
                    key={key}
                    value={key}
                    className="bg-white text-slate-700"
                  >
                    {label}
                  </option>
                )
              )}

          </select>
        )}

      </td>

      <td className="px-4 py-4">

        <span
          className={`
            inline-flex
            items-center
            rounded-full
            border
            px-3
            py-1
            text-xs
            font-semibold
            ${getStatusStyle(
              member.status
            )}
          `}
        >
          <span className="mr-1.5 text-[8px]">
            ●
          </span>

          {STATUS_LABEL[
            member.status
          ] || member.status}

        </span>

      </td>

      <td className="px-6 py-4 text-right">

        {!isOwner && (
          <button
            type="button"
            disabled={processing}
            onClick={() =>
              remove(member)
            }
            className="
              rounded-xl
              border
              border-red-100
              bg-red-50
              px-3
              py-2
              text-xs
              font-semibold
              text-red-600
              transition
              hover:bg-red-100
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Keluarkan
          </button>
        )}

      </td>

    </tr>
  );
}

// =========================================================
// MOBILE MEMBER CARD
// =========================================================

function MemberMobileCard({
  member,
  updateRole,
  remove,
  processing,
}) {
  const isOwner =
    member.role === 'OWNER';

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
            {getInitials(
              member.user?.name || '?'
            )}
          </div>

          <div className="min-w-0">

            <p className="truncate font-semibold text-slate-800">
              {member.user?.name || '-'}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              {member.user?.email || '-'}
            </p>

          </div>

        </div>

        <span
          className={`
            shrink-0
            rounded-full
            border
            px-2.5
            py-1
            text-[10px]
            font-semibold
            ${getStatusStyle(
              member.status
            )}
          `}
        >
          {STATUS_LABEL[
            member.status
          ] || member.status}
        </span>

      </div>

      <div className="mt-4">

        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Role
        </label>

        {isOwner ? (
          <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-xs font-semibold text-violet-700">
            Owner · Pemilik Keluarga
          </div>
        ) : (
          <select
            disabled={processing}
            className="
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              py-2.5
              text-xs
              font-medium
              text-slate-700
              outline-none
              focus:border-blue-500
              focus:ring-2
              focus:ring-blue-100
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            value={member.role}
            onChange={(e) =>
              updateRole(
                member,
                e.target.value
              )
            }
          >

            {Object.entries(
              ROLE_LABEL
            )
              .filter(
                ([key]) =>
                  key !== 'OWNER'
              )
              .map(
                ([key, label]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {label}
                  </option>
                )
              )}

          </select>
        )}

      </div>

      {!isOwner && (
        <button
          type="button"
          disabled={processing}
          onClick={() =>
            remove(member)
          }
          className="
            mt-3
            w-full
            rounded-xl
            border
            border-red-100
            bg-white
            px-3
            py-2.5
            text-xs
            font-semibold
            text-red-500
            transition
            hover:bg-red-50
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          Keluarkan Anggota
        </button>
      )}

    </div>
  );
}

// =========================================================
// CREATED ACCOUNT CARD
// =========================================================

function CreatedAccountCard({
  createdInfo,
  onClose,
}) {
  const [copied, setCopied] =
    useState(false);

  const copyCredentials =
    async () => {
      const text = [
        `Nama: ${createdInfo.name}`,
        `Email: ${createdInfo.email}`,
        `Password: ${createdInfo.password}`,
      ].join('\n');

      try {
        await navigator.clipboard.writeText(
          text
        );

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch {
        setCopied(false);
      }
    };

  return (
    <section className="overflow-hidden rounded-[24px] border border-emerald-200 bg-emerald-50/60 shadow-sm">

      <div className="p-5 sm:p-6">

        <div className="flex items-start gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5 12 4 4L19 6"
              />
            </svg>

          </div>

          <div className="min-w-0 flex-1">

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-sm font-bold text-emerald-800">
                  Akun berhasil dibuat
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Akun untuk{' '}
                  <span className="font-bold">
                    {createdInfo.name}
                  </span>{' '}
                  sudah berhasil ditambahkan.
                </p>

              </div>

              <button
                type="button"
                onClick={onClose}
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  text-emerald-500
                  transition
                  hover:bg-emerald-100
                  hover:text-emerald-700
                "
              >
                ×
              </button>

            </div>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {createdInfo.email}
                  </p>

                </div>

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Password Sementara
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-bold text-slate-800">
                    {createdInfo.password}
                  </p>

                </div>

              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                <button
                  type="button"
                  onClick={
                    copyCredentials
                  }
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-emerald-600
                    px-4
                    py-2.5
                    text-xs
                    font-bold
                    text-white
                    transition
                    hover:bg-emerald-700
                  "
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      Berhasil Disalin
                    </>
                  ) : (
                    <>
                      <span>⧉</span>
                      Salin Detail Login
                    </>
                  )}
                </button>

              </div>

              <p className="mt-3 text-[11px] leading-5 text-emerald-600">
                Simpan detail ini dengan aman. Password sementara
                hanya ditampilkan setelah akun berhasil dibuat.
                Sarankan anggota mengganti password setelah login.
              </p>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}

// =========================================================
// MEMBER FORM
// =========================================================

function MemberForm({
  form,
  setForm,
  submit,
  saving,
  showPassword,
  setShowPassword,
  regeneratePassword,
  onCancel,
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19a4 4 0 0 0-8 0"
              />

              <circle
                cx="11"
                cy="7"
                r="4"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 8v6M22 11h-6"
              />
            </svg>

          </div>

          <div>

            <h2 className="text-base font-bold text-slate-900">
              Tambah Anggota Baru
            </h2>

            <p className="mt-0.5 text-xs text-slate-400">
              Buat akun baru untuk anggota keluarga.
            </p>

          </div>

        </div>

      </div>

      <form
        onSubmit={submit}
        className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-2"
      >

        <FormField
          label="Nama Anggota"
          required
          hint="Nama lengkap anggota keluarga."
        >
          <input
            required
            type="text"
            autoComplete="name"
            value={form.name}
            disabled={saving}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            placeholder="Contoh: Budi Santoso"
            className="
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-800
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
        </FormField>

        <FormField
          label="Email"
          required
          hint="Digunakan untuk login ke FamFin."
        >
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            disabled={saving}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
            placeholder="nama@email.com"
            className="
              w-full
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-800
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
        </FormField>

        <FormField
          label="Role"
          required
          hint="Menentukan hak akses anggota."
        >
          <select
            value={form.role}
            disabled={saving}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value,
              })
            }
            className="
              w-full
              appearance-none
              rounded-2xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-3
              text-sm
              text-slate-800
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
            <option value="ADMIN">
              Admin
            </option>

            <option value="MEMBER">
              Member
            </option>

            <option value="VIEWER">
              Viewer
            </option>
          </select>
        </FormField>

        <FormField
          label="Password Awal"
          required
          hint="Minimal 8 karakter, terdiri dari huruf dan angka."
        >
          <div className="flex gap-2">

            <div className="relative min-w-0 flex-1">

              <input
                required
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                autoComplete="new-password"
                value={form.password}
                disabled={saving}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password:
                      e.target.value,
                  })
                }
                className="
                  w-full
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-3
                  pr-11
                  font-mono
                  text-sm
                  text-slate-800
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

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="
                  absolute
                  right-3
                  top-1/2
                  flex
                  h-7
                  w-7
                  -translate-y-1/2
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-600
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3l18 18"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.9 4.3A10.7 10.7 0 0 1 12 4c5 0 8.5 4 9.8 8a11.8 11.8 0 0 1-2.2 3.8M6.2 6.2C3.9 7.8 2.6 10.3 2.2 12c1.3 4 4.8 8 9.8 8 1.4 0 2.7-.3 3.8-.8"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="2.5"
                    />
                  </svg>
                )}
              </button>

            </div>

            <button
              type="button"
              disabled={saving}
              onClick={
                regeneratePassword
              }
              className="
                shrink-0
                rounded-2xl
                border
                border-slate-200
                bg-white
                px-4
                text-xs
                font-bold
                text-slate-600
                shadow-sm
                transition
                hover:bg-slate-50
                hover:text-blue-600
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Acak
            </button>

          </div>
        </FormField>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 lg:col-span-2">

          <div className="flex items-start gap-3">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-600">
              i
            </div>

            <div>

              <p className="text-xs font-bold text-blue-800">
                Tentang Role
              </p>

              <p className="mt-1 text-[11px] leading-5 text-blue-600">
                Admin dapat membantu mengelola keluarga dan data.
                Member dapat menggunakan fitur transaksi sesuai
                hak aksesnya, sedangkan Viewer hanya memiliki
                akses terbatas untuk melihat data.
              </p>

            </div>

          </div>

        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end lg:col-span-2">

          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-5
              py-3
              text-sm
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
            disabled={saving}
            className="
              rounded-2xl
              bg-blue-600
              px-5
              py-3
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            Buat Akun Anggota
          </button>

        </div>

      </form>

    </section>
  );
}

// =========================================================
// FORM FIELD
// =========================================================

function FormField({
  label,
  required = false,
  hint,
  children,
}) {
  return (
    <div>

      <div className="mb-2 flex items-center justify-between gap-2">

        <label className="text-xs font-bold text-slate-700">

          {label}

          {required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}

        </label>

      </div>

      {children}

      {hint && (
        <p className="mt-1.5 text-[10px] text-slate-400">
          {hint}
        </p>
      )}

    </div>
  );
}

// =========================================================
// TABLE SKELETON
// =========================================================

function MemberTableSkeleton() {
  return (
    <>
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <tr
          key={index}
          className="border-b border-slate-50"
        >

          <td className="px-6 py-5">

            <div className="flex items-center gap-3 animate-pulse">

              <div className="h-10 w-10 rounded-2xl bg-slate-100" />

              <div className="space-y-2">

                <div className="h-3 w-32 rounded bg-slate-100" />

                <div className="h-2.5 w-20 rounded bg-slate-100" />

              </div>

            </div>

          </td>

          <td className="px-4 py-5">

            <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />

          </td>

          <td className="px-4 py-5">

            <div className="h-7 w-20 animate-pulse rounded-xl bg-slate-100" />

          </td>

          <td className="px-4 py-5">

            <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />

          </td>

          <td className="px-6 py-5">

            <div className="ml-auto h-8 w-20 animate-pulse rounded-xl bg-slate-100" />

          </td>

        </tr>
      ))}
    </>
  );
}

// =========================================================
// MOBILE SKELETON
// =========================================================

function MemberMobileSkeleton() {
  return (
    <>
      {Array.from({
        length: 4,
      }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
        >

          <div className="flex gap-3">

            <div className="h-10 w-10 rounded-2xl bg-slate-100" />

            <div className="flex-1 space-y-2">

              <div className="h-3 w-32 rounded bg-slate-100" />

              <div className="h-2.5 w-44 rounded bg-slate-100" />

            </div>

            <div className="h-6 w-16 rounded-full bg-slate-100" />

          </div>

          <div className="mt-5 h-10 rounded-xl bg-slate-100" />

          <div className="mt-3 h-10 rounded-xl bg-slate-100" />

        </div>
      ))}
    </>
  );
}

// =========================================================
// EMPTY DESKTOP
// =========================================================

function EmptyMembers({
  search,
}) {
  return (
    <tr>

      <td
        colSpan={5}
        className="px-6 py-16 text-center"
      >

        <div className="mx-auto max-w-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-7 w-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
              />

              <circle
                cx="9"
                cy="7"
                r="4"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              />
            </svg>

          </div>

          <p className="mt-4 font-semibold text-slate-700">
            {search
              ? 'Anggota tidak ditemukan'
              : 'Belum ada anggota'}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {search
              ? 'Tidak ada anggota yang sesuai dengan pencarian.'
              : 'Tambahkan anggota keluarga untuk mulai mengelola akses bersama.'}
          </p>

        </div>

      </td>

    </tr>
  );
}

// =========================================================
// EMPTY MOBILE
// =========================================================

function EmptyMembersMobile({
  search,
}) {
  return (
    <div className="px-4 py-10 text-center">

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          />

          <circle
            cx="9"
            cy="7"
            r="4"
          />

          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          />
        </svg>

      </div>

      <p className="mt-3 font-semibold text-slate-700">
        {search
          ? 'Anggota tidak ditemukan'
          : 'Belum ada anggota'}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {search
          ? 'Coba gunakan kata kunci lain.'
          : 'Tambahkan anggota keluarga terlebih dahulu.'}
      </p>

    </div>
  );
}

// =========================================================
// SUCCESS POPUP
// =========================================================

function SuccessPopup({
  title,
  message,
  onClose,
}) {
  return (
    <>
      <style>
        {`
          @keyframes famfinSuccessBackdrop {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          @keyframes famfinSuccessModal {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.96);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes famfinSuccessIcon {
            0% {
              opacity: 0;
              transform: scale(0.65);
            }

            65% {
              opacity: 1;
              transform: scale(1.08);
            }

            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes famfinSuccessCheck {
            from {
              stroke-dashoffset: 32;
            }

            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes famfinSuccessProgress {
            from {
              transform: scaleX(0);
            }

            to {
              transform: scaleX(1);
            }
          }
        `}
      </style>

      <div
        className="
          fixed
          inset-0
          z-[10000]
          flex
          items-center
          justify-center
          bg-slate-900/30
          px-4
          backdrop-blur-[2px]
        "
        style={{
          animation:
            'famfinSuccessBackdrop 180ms ease-out forwards',
        }}
      >

        <div
          className="
            w-full
            max-w-md
            overflow-hidden
            rounded-[1.5rem]
            border
            border-slate-200
            bg-white
            shadow-2xl
            ring-1
            ring-black/5
          "
          style={{
            animation:
              'famfinSuccessModal 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >

          <div className="px-6 pb-6 pt-7 sm:px-7">

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
                  ring-8
                  ring-emerald-50/50
                "
                style={{
                  animation:
                    'famfinSuccessIcon 420ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both',
                }}
              >

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  className="h-8 w-8 text-emerald-600"
                >

                  <path
                    d="M5 12.5l4 4L19 6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="32"
                    strokeDashoffset="32"
                    style={{
                      animation:
                        'famfinSuccessCheck 420ms ease-out 220ms forwards',
                    }}
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

                <span
                  className="
                    flex
                    h-4
                    w-4
                    items-center
                    justify-center
                    rounded-full
                    bg-emerald-100
                    text-emerald-600
                  "
                >

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="h-2.5 w-2.5"
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
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-emerald-700
                hover:shadow-md
                active:scale-[0.99]
              "
            >
              Selesai
            </button>

          </div>

          <div className="h-1.5 bg-emerald-50">

            <div
              className="
                h-full
                w-full
                origin-left
                bg-emerald-500
              "
              style={{
                animation:
                  'famfinSuccessProgress 3s linear forwards',
              }}
            />

          </div>

        </div>

      </div>
    </>
  );
}

// =========================================================
// ERROR POPUP
// =========================================================

function ErrorPopup({
  title,
  message,
  onClose,
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[10001]
        flex
        items-center
        justify-center
        bg-slate-900/30
        px-4
        backdrop-blur-[2px]
      "
    >

      <div
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
          ring-1
          ring-black/5
        "
      >

        <div className="p-6">

          <div className="flex justify-center">

            <div
              className="
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-full
                bg-red-50
                text-red-600
              "
            >

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-7 w-7"
              >

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6L6 18"
                />

              </svg>

            </div>

          </div>

          <div className="mt-4 text-center">

            <h3 className="text-base font-bold text-slate-900">
              {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
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
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-red-700
              hover:shadow-md
            "
          >
            Mengerti
          </button>

        </div>

        <div className="h-1 bg-red-50">

          <div className="h-full w-full bg-red-500" />

        </div>

      </div>

    </div>
  );
}