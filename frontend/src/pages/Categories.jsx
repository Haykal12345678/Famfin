import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

import ConfirmModal from '../components/ConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay';


// =========================================================
// TYPE CONFIG
// =========================================================

const TYPE_CONFIG = {
  INCOME: {
    label: 'Pemasukan',
    shortLabel: 'Masuk',
    icon: '↗',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
  },

  EXPENSE: {
    label: 'Pengeluaran',
    shortLabel: 'Keluar',
    icon: '↘',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-100',
  },
};


// =========================================================
// EMPTY FORM
// =========================================================

const EMPTY_FORM = {
  name: '',
  type: 'EXPENSE',
};


// =========================================================
// EMPTY CONFIRM
// =========================================================

const EMPTY_CONFIRM = {
  open: false,
  type: null,
  title: '',
  message: '',
  confirmText: 'Ya, Lanjutkan',
  cancelText: 'Batal',
  variant: 'primary',
};


// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Categories() {

  // =======================================================
  // DATA
  // =======================================================

  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);


  // =======================================================
  // GENERAL STATE
  // =======================================================

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);


  // =======================================================
  // PROCESSING
  // =======================================================

  const [processing, setProcessing] = useState(false);

  const [processingTitle, setProcessingTitle] =
    useState('Memproses Data');

  const [processingMessage, setProcessingMessage] =
    useState(
      'Sedang memproses perubahan data. Mohon tunggu sebentar...'
    );


  // =======================================================
  // SEARCH / FILTER
  // =======================================================

  const [search, setSearch] = useState('');

  const [activeType, setActiveType] = useState('ALL');


  // =======================================================
  // CONFIRM MODAL
  // =======================================================

  const [confirm, setConfirm] =
    useState(EMPTY_CONFIRM);


  // =======================================================
  // SELECTED CATEGORY
  // =======================================================

  const [selectedCategory, setSelectedCategory] =
    useState(null);


  // =======================================================
  // SUCCESS POPUP
  // =======================================================

  const [success, setSuccess] = useState({
    show: false,
    title: '',
    message: '',
  });


  // =======================================================
  // ERROR POPUP
  // =======================================================

  const [errorPopup, setErrorPopup] = useState({
    show: false,
    title: '',
    message: '',
  });


  // =======================================================
  // SUCCESS
  // =======================================================

  const showSuccess = (title, message) => {

    setSuccess({
      show: true,
      title,
      message,
    });

  };


  const closeSuccess = () => {

    setSuccess((prev) => ({
      ...prev,
      show: false,
    }));

  };


  // =======================================================
  // ERROR
  // =======================================================

  const showErrorPopup = (title, message) => {

    setErrorPopup({
      show: true,
      title,
      message,
    });

  };


  const closeErrorPopup = () => {

    setErrorPopup((prev) => ({
      ...prev,
      show: false,
    }));

  };


  // =======================================================
  // CLOSE CONFIRM
  // =======================================================

  const closeConfirm = () => {

    if (processing) return;

    setConfirm(EMPTY_CONFIRM);

    setSelectedCategory(null);

  };


  // =======================================================
  // LOAD DATA
  // =======================================================

  const load = async (refresh = false) => {

    try {

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }


      const res = await api.get(
        '/categories?includeInactive=true'
      );


      setCategories(
        Array.isArray(res.data)
          ? res.data
          : []
      );

    } catch (err) {

      console.error(
        'Gagal memuat kategori:',
        err
      );


      showErrorPopup(
        'Gagal Memuat Kategori',
        err.response?.data?.message ||
          'Gagal memuat kategori. Silakan coba lagi.'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  };


  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {

    load(false);

  }, []);


  // =======================================================
  // SUBMIT ADD
  // =======================================================

  const submit = (e) => {

    e.preventDefault();

    if (processing) return;


    setError('');


    const categoryName =
      form.name.trim();


    if (!categoryName) {

      showErrorPopup(
        'Nama Kategori Wajib Diisi',
        'Silakan masukkan nama kategori terlebih dahulu.'
      );

      return;
    }


    setConfirm({
      open: true,
      type: 'ADD',
      title: 'Tambah Kategori?',
      message: `Apakah Anda yakin ingin menambahkan kategori "${categoryName}" sebagai ${
        form.type === 'INCOME'
          ? 'Pemasukan'
          : 'Pengeluaran'
      }?`,
      confirmText: 'Ya, Tambahkan',
      cancelText: 'Batal',
      variant: 'primary',
    });

  };


  // =======================================================
  // OPEN ACTION CONFIRM
  // =======================================================

  const openActionConfirm = (
    category,
    action
  ) => {

    if (processing) return;

    if (!category) return;


    // =====================================================
    // DEFAULT CATEGORY
    // =====================================================

    if (category.isDefault) {

      showErrorPopup(
        'Kategori Default',
        'Kategori default sistem tidak dapat dinonaktifkan atau diaktifkan kembali.'
      );

      return;
    }


    setSelectedCategory(category);


    // =====================================================
    // DEACTIVATE
    //
    // DANGER ACTION
    // =====================================================

    if (action === 'DEACTIVATE') {

      setConfirm({
        open: true,
        type: 'DEACTIVATE',
        title: 'Nonaktifkan Kategori?',
        message: `Apakah Anda yakin ingin menonaktifkan kategori "${category.name}"? Kategori ini tidak akan digunakan untuk transaksi baru.`,
        confirmText: 'Ya, Nonaktifkan',
        cancelText: 'Batal',
        variant: 'danger',
      });

      return;
    }


    // =====================================================
    // ACTIVATE
    // =====================================================

    if (action === 'ACTIVATE') {

      setConfirm({
        open: true,
        type: 'ACTIVATE',
        title: 'Aktifkan Kategori?',
        message: `Apakah Anda yakin ingin mengaktifkan kembali kategori "${category.name}"? Kategori ini akan dapat digunakan untuk transaksi baru.`,
        confirmText: 'Ya, Aktifkan',
        cancelText: 'Batal',
        variant: 'primary',
      });

    }

  };


  // =======================================================
  // CONFIRM ACTION
  // =======================================================

  const handleConfirm = async () => {

    if (processing) return;


    if (confirm.type === 'ADD') {

      await confirmAdd();

      return;
    }


    if (
      confirm.type === 'DEACTIVATE' ||
      confirm.type === 'ACTIVATE'
    ) {

      await confirmCategoryAction();

    }

  };


  // =======================================================
  // CONFIRM ADD
  // =======================================================

  const confirmAdd = async () => {

    if (processing) return;


    const categoryName =
      form.name.trim();


    if (!categoryName) {

      closeConfirm();

      showErrorPopup(
        'Nama Kategori Wajib Diisi',
        'Silakan masukkan nama kategori terlebih dahulu.'
      );

      return;
    }


    setConfirm((prev) => ({
      ...prev,
      open: false,
    }));


    setProcessing(true);

    setProcessingTitle(
      'Memproses Data'
    );

    setProcessingMessage(
      'Sedang menambahkan kategori. Mohon tunggu sebentar...'
    );


    try {

      const res = await api.post(
        '/categories',
        {
          name: categoryName,
          type: form.type,
        }
      );


      const newCategory =
        res.data?.data ||
        res.data?.category ||
        res.data;


      if (newCategory?.id) {

        setCategories((prev) => [
          newCategory,
          ...prev,
        ]);

      } else {

        await load(true);

      }


      setForm(EMPTY_FORM);

      setProcessing(false);


      showSuccess(
        'Berhasil',
        `Kategori "${categoryName}" berhasil ditambahkan.`
      );

    } catch (err) {

      console.error(
        'Gagal menambahkan kategori:',
        err
      );


      const status =
        err.response?.status;

      const message =
        err.response?.data?.message;


      setProcessing(false);


      if (status === 409) {

        showErrorPopup(
          'Kategori Sudah Ada',
          message ||
            `Kategori "${categoryName}" sudah terdaftar.`
        );

        return;
      }


      showErrorPopup(
        'Gagal Menambahkan Kategori',
        message ||
          'Terjadi kesalahan saat menambahkan kategori. Silakan coba lagi.'
      );

    }

  };


  // =======================================================
  // CONFIRM CATEGORY ACTION
  // =======================================================

  const confirmCategoryAction = async () => {

    if (processing) return;


    if (!selectedCategory?.id) {

      closeConfirm();

      return;
    }


    const category =
      selectedCategory;


    const categoryName =
      category.name;


    const currentAction =
      confirm.type;


    setConfirm((prev) => ({
      ...prev,
      open: false,
    }));


    setProcessing(true);

    setProcessingTitle(
      'Memproses Data'
    );


    if (currentAction === 'DEACTIVATE') {

      setProcessingMessage(
        'Sedang menonaktifkan kategori. Mohon tunggu sebentar...'
      );

    } else {

      setProcessingMessage(
        'Sedang mengaktifkan kategori. Mohon tunggu sebentar...'
      );

    }


    try {

      // ===================================================
      // DEACTIVATE
      // ===================================================

      if (currentAction === 'DEACTIVATE') {

        await api.delete(
          `/categories/${category.id}`
        );


        setCategories((prev) =>
          prev.map((item) =>
            item.id === category.id
              ? {
                  ...item,
                  isActive: false,
                }
              : item
          )
        );


        setSelectedCategory(null);

        setProcessing(false);


        showSuccess(
          'Berhasil',
          `Kategori "${categoryName}" berhasil dinonaktifkan.`
        );

        return;
      }


      // ===================================================
      // ACTIVATE
      // ===================================================

      if (currentAction === 'ACTIVATE') {

        await api.patch(
          `/categories/${category.id}/activate`
        );


        setCategories((prev) =>
          prev.map((item) =>
            item.id === category.id
              ? {
                  ...item,
                  isActive: true,
                }
              : item
          )
        );


        setSelectedCategory(null);

        setProcessing(false);


        showSuccess(
          'Berhasil',
          `Kategori "${categoryName}" berhasil diaktifkan kembali.`
        );

        return;
      }

    } catch (err) {

      console.error(
        'Gagal memproses kategori:',
        err
      );


      const status =
        err.response?.status;

      const message =
        err.response?.data?.message;


      setSelectedCategory(null);

      setProcessing(false);


      if (status === 404) {

        showErrorPopup(
          'Kategori Tidak Ditemukan',
          message ||
            'Kategori tidak ditemukan.'
        );

        return;
      }


      if (status === 409) {

        showErrorPopup(
          'Kategori Tidak Dapat Diproses',
          message ||
            'Kategori tidak dapat diproses karena masih digunakan oleh transaksi.'
        );

        return;
      }


      showErrorPopup(
        currentAction === 'ACTIVATE'
          ? 'Gagal Mengaktifkan Kategori'
          : 'Gagal Menonaktifkan Kategori',
        message ||
          'Terjadi kesalahan saat memproses kategori. Silakan coba lagi.'
      );

    }

  };


  // =======================================================
  // FILTER
  // =======================================================

  const filteredCategories =
    useMemo(() => {

      const keyword =
        search.trim().toLowerCase();


      return categories.filter(
        (category) => {

          const matchesSearch =
            !keyword ||
            category.name
              ?.toLowerCase()
              .includes(keyword);


          const matchesType =
            activeType === 'ALL' ||
            category.type === activeType;


          return (
            matchesSearch &&
            matchesType
          );

        }
      );

    }, [
      categories,
      search,
      activeType,
    ]);


  // =======================================================
  // INCOME / EXPENSE
  // =======================================================

  const income =
    filteredCategories.filter(
      (category) =>
        category.type === 'INCOME'
    );


  const expense =
    filteredCategories.filter(
      (category) =>
        category.type === 'EXPENSE'
    );


  // =======================================================
  // SUMMARY
  // =======================================================

  const activeCategories =
    categories.filter(
      (category) =>
        category.isActive !== false
    );


  const inactiveCategories =
    categories.filter(
      (category) =>
        category.isActive === false
    );


  const incomeCount =
    activeCategories.filter(
      (category) =>
        category.type === 'INCOME'
    ).length;


  const expenseCount =
    activeCategories.filter(
      (category) =>
        category.type === 'EXPENSE'
    ).length;


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          PROCESSING
      ================================================= */}

      <LoadingOverlay
        loading={processing}
        title={processingTitle}
        message={processingMessage}
      />


      {/* =================================================
          SUCCESS
      ================================================= */}

      {success.show && (

        <SuccessPopup
          title={success.title}
          message={success.message}
          onClose={closeSuccess}
        />

      )}


      {/* =================================================
          ERROR
      ================================================= */}

      {errorPopup.show && (

        <ErrorPopup
          title={errorPopup.title}
          message={errorPopup.message}
          onClose={closeErrorPopup}
        />

      )}


      {/* =================================================
          HEADER
      ================================================= */}

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">

        <div className="relative p-6 lg:p-7">

          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-50/70 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Kategori
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Kelola kategori pemasukan dan
                pengeluaran agar transaksi keluarga
                lebih rapi dan mudah dianalisis.
              </p>

            </div>


            <button
              type="button"
              onClick={() => load(true)}
              disabled={
                refreshing ||
                processing
              }
              className="
                inline-flex
                items-center
                justify-center
                rounded-xl
                border
                border-blue-200
                bg-blue-50
                px-4
                py-2.5
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

          </div>

        </div>

      </section>


      {/* =================================================
          SUMMARY
      ================================================= */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">

        <SummaryCard
          label="Total Kategori"
          value={activeCategories.length}
          description="Kategori aktif"
          icon="▦"
          iconBg="bg-blue-50"
          iconText="text-blue-600"
        />

        <SummaryCard
          label="Pemasukan"
          value={incomeCount}
          description="Kategori pemasukan aktif"
          icon="↗"
          iconBg="bg-emerald-50"
          iconText="text-emerald-600"
        />

        <SummaryCard
          label="Pengeluaran"
          value={expenseCount}
          description="Kategori pengeluaran aktif"
          icon="↘"
          iconBg="bg-rose-50"
          iconText="text-rose-600"
        />

        <SummaryCard
          label="Nonaktif"
          value={inactiveCategories.length}
          description="Kategori dapat diaktifkan"
          icon="○"
          iconBg="bg-slate-100"
          iconText="text-slate-500"
        />

      </section>


      {/* =================================================
          ADD CATEGORY
      ================================================= */}

      <form
        onSubmit={submit}
        className="
          overflow-hidden
          rounded-[1.75rem]
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >

        <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-600">
              +
            </div>

            <div>

              <h2 className="font-semibold text-slate-900">
                Tambah Kategori
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Buat kategori baru untuk membantu
                mengelompokkan transaksi.
              </p>

            </div>

          </div>

        </div>


        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_240px_auto] lg:items-end">

          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">

              Nama Kategori

              <span className="ml-1 text-red-500">
                *
              </span>

            </label>


            <input
              required
              disabled={processing}
              className="
                category-input
                disabled:cursor-not-allowed
                disabled:bg-slate-50
              "
              placeholder="Contoh: Belanja Bulanan"
              value={form.name}
              onChange={(e) => {

                setForm({
                  ...form,
                  name: e.target.value,
                });


                if (error) {
                  setError('');
                }

              }}
            />

          </div>


          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Jenis
            </label>


            <select
              disabled={processing}
              className="
                category-input
                disabled:cursor-not-allowed
                disabled:bg-slate-50
              "
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value,
                })
              }
            >

              <option value="INCOME">
                Pemasukan
              </option>

              <option value="EXPENSE">
                Pengeluaran
              </option>

            </select>

          </div>


          <button
            type="submit"
            disabled={processing}
            className="
              inline-flex
              h-[42px]
              items-center
              justify-center
              rounded-xl
              bg-blue-600
              px-5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:bg-blue-700
              hover:shadow-md
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            + Tambah Kategori
          </button>

        </div>

      </form>


      {/* =================================================
          SEARCH & FILTER
      ================================================= */}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-semibold text-slate-800">
              Daftar Kategori
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Kategori aktif dan nonaktif ditampilkan di sini.
            </p>

          </div>


          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[500px]">

            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Cari kategori
              </label>


              <input
                type="text"
                disabled={processing}
                className="
                  category-input
                  disabled:cursor-not-allowed
                  disabled:bg-slate-50
                "
                placeholder="Cari nama kategori..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>


            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Jenis kategori
              </label>


              <select
                disabled={processing}
                className="
                  category-input
                  disabled:cursor-not-allowed
                  disabled:bg-slate-50
                "
                value={activeType}
                onChange={(e) =>
                  setActiveType(e.target.value)
                }
              >

                <option value="ALL">
                  Semua Jenis
                </option>

                <option value="INCOME">
                  Pemasukan
                </option>

                <option value="EXPENSE">
                  Pengeluaran
                </option>

              </select>

            </div>

          </div>

        </div>


        {/* =================================================
            CATEGORY LIST
        ================================================= */}

        <div className="mt-6">

          {loading ? (

            <CategorySkeleton />

          ) : filteredCategories.length === 0 ? (

            <EmptyCategories
              hasFilter={
                !!search ||
                activeType !== 'ALL'
              }
              onReset={() => {

                setSearch('');
                setActiveType('ALL');

              }}
            />

          ) : (

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

              <CategoryList
                title="Pemasukan"
                type="INCOME"
                items={income}
                onAction={openActionConfirm}
                disabled={processing}
              />


              <CategoryList
                title="Pengeluaran"
                type="EXPENSE"
                items={expense}
                onAction={openActionConfirm}
                disabled={processing}
              />

            </div>

          )}

        </div>

      </section>


      {/* =================================================
          CONFIRM MODAL
      ================================================= */}

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        variant={confirm.variant}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        loading={processing}
      />

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
          @keyframes successProgress {
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
          backdrop-blur-[3px]
          animate-[fadeIn_0.18s_ease-out]
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
            animate-[successModalIn_0.35s_cubic-bezier(0.16,1,0.3,1)]
          "
        >

          <div className="p-6 sm:p-7">

            {/* ICON */}

            <div className="flex justify-center">

              <div
                className="
                  relative
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-50
                  text-emerald-600
                  animate-[successIconIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)]
                "
              >

                <div
                  className="
                    absolute
                    inset-0
                    rounded-full
                    border-4
                    border-emerald-100
                    animate-[successRing_0.7s_ease-out]
                  "
                />

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  className="
                    h-8
                    w-8
                    animate-[checkDraw_0.45s_ease-out_0.18s_both]
                  "
                >

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12.5l4 4L19 6.5"
                  />

                </svg>

              </div>

            </div>


            {/* CONTENT */}

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


            {/* BUTTON */}

            <button
              type="button"
              onClick={onClose}
              className="
                mt-6
                w-full
                rounded-xl
                bg-emerald-600
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-emerald-700
                hover:shadow-md
                active:scale-[0.98]
              "
            >
              Selesai
            </button>

          </div>


          {/* PROGRESS */}

          <div className="h-1 bg-emerald-50">

            <div
              className="
                h-full
                w-full
                origin-left
                bg-emerald-500
                animate-[successProgress_3s_ease-out_forwards]
              "
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
        backdrop-blur-[3px]
        animate-[fadeIn_0.18s_ease-out]
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
          animate-[scaleIn_0.22s_ease-out]
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
                animate-[errorIconIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)]
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
              active:scale-[0.98]
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


// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconBg,
  iconText,
}) {

  return (
    <div
      className="
        group
        relative
        overflow-hidden
        rounded-[1.5rem]
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >

      <div
        className="
          pointer-events-none
          absolute
          -right-8
          -top-8
          h-24
          w-24
          rounded-full
          bg-slate-50
          transition-transform
          duration-300
          group-hover:scale-125
        "
      />


      <div className="relative flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>

        </div>


        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-2xl
            text-lg
            font-bold
            ${iconBg}
            ${iconText}
          `}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}


// =========================================================
// CATEGORY LIST
// =========================================================

function CategoryList({
  title,
  type,
  items,
  onAction,
  disabled,
}) {

  const config =
    TYPE_CONFIG[type] ||
    TYPE_CONFIG.EXPENSE;


  const activeCount =
    items.filter(
      (item) => item.isActive !== false
    ).length;


  const inactiveCount =
    items.filter(
      (item) => item.isActive === false
    ).length;


  return (
    <div
      className="
        overflow-hidden
        rounded-[1.5rem]
        border
        border-slate-200
        bg-white
      "
    >

      <div
        className={`
          flex
          items-center
          justify-between
          gap-3
          border-b
          ${config.border}
          ${config.bg}
          px-5
          py-4
        `}
      >

        <div className="flex items-center gap-3">

          <div
            className={`
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-white
              text-base
              font-bold
              shadow-sm
              ${config.text}
            `}
          >
            {config.icon}
          </div>


          <div>

            <h2 className="text-sm font-bold text-slate-800">
              {title}
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-400">
              {activeCount} aktif
              {inactiveCount > 0 &&
                ` • ${inactiveCount} nonaktif`}
            </p>

          </div>

        </div>


        <span
          className={`
            rounded-full
            bg-white
            px-2.5
            py-1
            text-[10px]
            font-semibold
            ${config.text}
          `}
        >
          {config.shortLabel}
        </span>

      </div>


      <div className="p-3">

        {items.length === 0 ? (

          <div
            className="
              flex
              min-h-[150px]
              items-center
              justify-center
              px-4
              text-center
            "
          >

            <div>

              <div
                className="
                  mx-auto
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-50
                  text-slate-300
                "
              >
                {config.icon}
              </div>

              <p className="mt-3 text-xs font-medium text-slate-500">
                Belum ada kategori
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                Tambahkan kategori baru di atas.
              </p>

            </div>

          </div>

        ) : (

          <div className="space-y-1">

            {items.map((category) => (

              <CategoryItem
                key={category.id}
                category={category}
                config={config}
                onAction={onAction}
                disabled={disabled}
              />

            ))}

          </div>

        )}

      </div>

    </div>
  );
}


// =========================================================
// CATEGORY ITEM
// =========================================================

function CategoryItem({
  category,
  config,
  onAction,
  disabled,
}) {

  const isActive =
    category.isActive !== false;


  return (
    <div
      className={`
        group
        flex
        items-center
        justify-between
        gap-3
        rounded-xl
        border
        px-3
        py-3
        transition-all
        duration-150
        ${
          isActive
            ? 'border-transparent hover:border-slate-100 hover:bg-slate-50'
            : 'border-slate-100 bg-slate-50/70 opacity-75'
        }
      `}
    >

      <div className="flex min-w-0 items-center gap-3">

        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${config.bg}
            ${config.text}
            text-sm
            font-bold
          `}
        >
          {config.icon}
        </div>


        <div className="min-w-0">

          <div className="flex min-w-0 flex-wrap items-center gap-2">

            <p
              className={`
                truncate
                text-sm
                font-semibold
                ${
                  isActive
                    ? 'text-slate-700'
                    : 'text-slate-500'
                }
              `}
            >
              {category.name}
            </p>


            {category.isDefault && (

              <span
                className="
                  shrink-0
                  rounded-full
                  bg-slate-100
                  px-2
                  py-0.5
                  text-[9px]
                  font-medium
                  text-slate-500
                "
              >
                Default
              </span>

            )}


            {!isActive && (

              <span
                className="
                  shrink-0
                  rounded-full
                  bg-red-50
                  px-2
                  py-0.5
                  text-[9px]
                  font-semibold
                  text-red-500
                "
              >
                Nonaktif
              </span>

            )}


            {isActive && !category.isDefault && (

              <span
                className="
                  shrink-0
                  rounded-full
                  bg-emerald-50
                  px-2
                  py-0.5
                  text-[9px]
                  font-semibold
                  text-emerald-600
                "
              >
                Aktif
              </span>

            )}

          </div>


          <p className="mt-0.5 text-[10px] text-slate-400">
            {config.label}
          </p>

        </div>

      </div>


      {category.isDefault ? (

        <span
          className="
            shrink-0
            text-[10px]
            text-slate-300
          "
        >
          Sistem
        </span>

      ) : isActive ? (

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction(
              category,
              'DEACTIVATE'
            )
          }
          className="
            shrink-0
            rounded-lg
            px-2.5
            py-2
            text-[11px]
            font-semibold
            text-slate-400
            transition
            hover:bg-red-50
            hover:text-red-600
            disabled:cursor-not-allowed
            disabled:opacity-30
            sm:opacity-0
            sm:group-hover:opacity-100
          "
          title="Nonaktifkan kategori"
        >
          Nonaktifkan
        </button>

      ) : (

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction(
              category,
              'ACTIVATE'
            )
          }
          className="
            shrink-0
            rounded-lg
            bg-emerald-50
            px-3
            py-2
            text-[11px]
            font-semibold
            text-emerald-600
            transition
            hover:bg-emerald-100
            hover:text-emerald-700
            disabled:cursor-not-allowed
            disabled:opacity-30
          "
          title="Aktifkan kembali kategori"
        >
          Aktifkan
        </button>

      )}

    </div>
  );
}


// =========================================================
// CATEGORY SKELETON
// =========================================================

function CategorySkeleton() {

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

      {Array.from({
        length: 2,
      }).map((_, index) => (

        <div
          key={index}
          className="
            overflow-hidden
            rounded-[1.5rem]
            border
            border-slate-200
            bg-white
          "
        >

          <div
            className="
              animate-pulse
              border-b
              border-slate-100
              bg-slate-50
              p-5
            "
          >

            <div className="flex items-center gap-3">

              <div
                className="
                  h-10
                  w-10
                  rounded-xl
                  bg-slate-200
                "
              />

              <div className="space-y-2">

                <div
                  className="
                    h-3
                    w-28
                    rounded
                    bg-slate-200
                  "
                />

                <div
                  className="
                    h-2.5
                    w-20
                    rounded
                    bg-slate-200
                  "
                />

              </div>

            </div>

          </div>


          <div className="space-y-2 p-4">

            {Array.from({
              length: 4,
            }).map((_, itemIndex) => (

              <div
                key={itemIndex}
                className="
                  flex
                  animate-pulse
                  items-center
                  gap-3
                  rounded-xl
                  p-3
                "
              >

                <div
                  className="
                    h-9
                    w-9
                    rounded-xl
                    bg-slate-100
                  "
                />

                <div className="flex-1 space-y-2">

                  <div
                    className="
                      h-3
                      w-32
                      rounded
                      bg-slate-100
                    "
                  />

                  <div
                    className="
                      h-2.5
                      w-20
                      rounded
                      bg-slate-100
                    "
                  />

                </div>

                <div
                  className="
                    h-7
                    w-20
                    rounded-lg
                    bg-slate-100
                  "
                />

              </div>

            ))}

          </div>

        </div>

      ))}

    </div>
  );
}


// =========================================================
// EMPTY CATEGORIES
// =========================================================

function EmptyCategories({
  hasFilter,
  onReset,
}) {

  return (
    <div
      className="
        flex
        min-h-[280px]
        flex-col
        items-center
        justify-center
        rounded-[1.5rem]
        border
        border-dashed
        border-slate-200
        bg-slate-50/50
        px-6
        py-12
        text-center
      "
    >

      <div
        className="
          flex
          h-16
          w-16
          items-center
          justify-center
          rounded-3xl
          bg-white
          text-2xl
          shadow-sm
          ring-1
          ring-slate-100
        "
      >
        {hasFilter ? '⌕' : '▦'}
      </div>


      <h3 className="mt-4 text-sm font-bold text-slate-800">

        {hasFilter
          ? 'Kategori tidak ditemukan'
          : 'Belum ada kategori'}

      </h3>


      <p
        className="
          mt-1
          max-w-sm
          text-xs
          leading-5
          text-slate-400
        "
      >

        {hasFilter
          ? 'Tidak ada kategori yang sesuai dengan pencarian atau filter yang dipilih.'
          : 'Tambahkan kategori pertama untuk mulai mengelompokkan kategori.'}

      </p>


      {hasFilter && (

        <button
          type="button"
          onClick={onReset}
          className="
            mt-5
            rounded-xl
            bg-blue-600
            px-4
            py-2.5
            text-xs
            font-semibold
            text-white
            shadow-sm
            transition
            hover:bg-blue-700
            hover:shadow-md
          "
        >
          Reset Filter
        </button>

      )}

    </div>
  );
}