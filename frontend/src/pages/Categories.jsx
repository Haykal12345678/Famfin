import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const TYPE_CONFIG = {
  INCOME: {
    label: 'Pemasukan',
    shortLabel: 'Masuk',
    icon: '↗',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
    accent: 'bg-emerald-500',
  },
  EXPENSE: {
    label: 'Pengeluaran',
    shortLabel: 'Keluar',
    icon: '↘',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-100',
    accent: 'bg-rose-500',
  },
};

const EMPTY_FORM = {
  name: '',
  type: 'EXPENSE',
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('ALL');

  const load = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get('/categories');

      setCategories(res.data || []);
    } catch (err) {
      console.error('Gagal memuat kategori:', err);

      setError(
        err.response?.data?.message ||
          'Gagal memuat kategori.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    setError('');

    const categoryName = form.name.trim();

    if (!categoryName) {
      setError('Nama kategori wajib diisi.');
      return;
    }

    setSaving(true);

    try {
      await api.post('/categories', {
        name: categoryName,
        type: form.type,
      });

      setForm(EMPTY_FORM);

      await load(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal menambahkan kategori.'
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const confirmed = window.confirm(
      'Kategori ini akan dinonaktifkan. Lanjutkan?'
    );

    if (!confirmed) return;

    try {
      await api.delete(`/categories/${id}`);

      await load(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal menonaktifkan kategori.'
      );
    }
  };

  const filteredCategories = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return categories.filter((category) => {
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
    });
  }, [
    categories,
    search,
    activeType,
  ]);

  const income = filteredCategories.filter(
    (category) =>
      category.type === 'INCOME'
  );

  const expense = filteredCategories.filter(
    (category) =>
      category.type === 'EXPENSE'
  );

  const activeCategories =
    categories.filter(
      (category) =>
        category.isActive !== false
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

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

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
              disabled={refreshing}
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


      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">

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

      </section>


      {/* =====================================================
          ADD CATEGORY
      ===================================================== */}

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
              className="category-input"
              placeholder="Contoh: Belanja Bulanan"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
            />

          </div>


          <div>

            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Jenis
            </label>

            <select
              className="category-input"
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
            disabled={saving}
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
            {saving
              ? 'Menyimpan...'
              : '+ Tambah Kategori'}
          </button>


          {error && (
            <div className="lg:col-span-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

        </div>

      </form>


      {/* =====================================================
          SEARCH & FILTER
      ===================================================== */}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-semibold text-slate-800">
              Daftar Kategori
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Cari dan filter kategori sesuai
              kebutuhan.
            </p>

          </div>


          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[500px]">

            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Cari kategori
              </label>

              <input
                type="text"
                className="category-input"
                placeholder="Cari nama kategori..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>


            <div>

              <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                Jenis kategori
              </label>

              <select
                className="category-input"
                value={activeType}
                onChange={(e) =>
                  setActiveType(
                    e.target.value
                  )
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
                onRemove={remove}
              />

              <CategoryList
                title="Pengeluaran"
                type="EXPENSE"
                items={expense}
                onRemove={remove}
              />

            </div>
          )}

        </div>

      </section>

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
  onRemove,
}) {
  const config =
    TYPE_CONFIG[type] ||
    TYPE_CONFIG.EXPENSE;

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

      {/* Header */}

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
              {items.length} kategori
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


      {/* List */}

      <div className="p-3">

        {items.length === 0 ? (
          <div className="flex min-h-[150px] items-center justify-center px-4 text-center">

            <div>

              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-300">
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
                onRemove={onRemove}
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
  onRemove,
}) {
  return (
    <div
      className="
        group
        flex
        items-center
        justify-between
        gap-3
        rounded-xl
        border
        border-transparent
        px-3
        py-3
        transition-all
        duration-150
        hover:border-slate-100
        hover:bg-slate-50
      "
    >

      {/* Left */}

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

          <div className="flex min-w-0 items-center gap-2">

            <p className="truncate text-sm font-semibold text-slate-700">
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

          </div>

          <p className="mt-0.5 text-[10px] text-slate-400">
            {config.label}
          </p>

        </div>

      </div>


      {/* Action */}

      {!category.isDefault && (
        <button
          type="button"
          onClick={() =>
            onRemove(category.id)
          }
          className="
            shrink-0
            rounded-lg
            px-2.5
            py-2
            text-[11px]
            font-semibold
            text-slate-400
            opacity-100
            transition
            hover:bg-red-50
            hover:text-red-600
            sm:opacity-0
            sm:group-hover:opacity-100
          "
          title="Nonaktifkan kategori"
        >
          Nonaktifkan
        </button>
      )}

      {category.isDefault && (
        <span className="shrink-0 text-[10px] text-slate-300">
          Sistem
        </span>
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

          {/* Header skeleton */}

          <div className="animate-pulse border-b border-slate-100 bg-slate-50 p-5">

            <div className="flex items-center gap-3">

              <div className="h-10 w-10 rounded-xl bg-slate-200" />

              <div className="space-y-2">

                <div className="h-3 w-28 rounded bg-slate-200" />

                <div className="h-2.5 w-20 rounded bg-slate-200" />

              </div>

            </div>

          </div>


          {/* Items skeleton */}

          <div className="space-y-2 p-4">

            {Array.from({
              length: 4,
            }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="animate-pulse flex items-center gap-3 rounded-xl p-3"
              >

                <div className="h-9 w-9 rounded-xl bg-slate-100" />

                <div className="flex-1 space-y-2">

                  <div className="h-3 w-32 rounded bg-slate-100" />

                  <div className="h-2.5 w-20 rounded bg-slate-100" />

                </div>

                <div className="h-7 w-20 rounded-lg bg-slate-100" />

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

      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm ring-1 ring-slate-100">
        {hasFilter ? '⌕' : '▦'}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800">

        {hasFilter
          ? 'Kategori tidak ditemukan'
          : 'Belum ada kategori'}

      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">

        {hasFilter
          ? 'Tidak ada kategori yang sesuai dengan pencarian atau filter yang dipilih.'
          : 'Tambahkan kategori pertama untuk mulai mengelompokkan transaksi.'}

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
// =========================================================
// CATEGORY INPUT STYLE
// =========================================================
//
// Digunakan oleh:
//
// <input className="category-input" />
// <select className="category-input" />
//
// Kalau Tailwind project lo support @apply,
// styling ini bisa dipindahkan ke index.css.
// =========================================================


// Tidak perlu export apa pun dari file ini.
// Semua component sudah selesai di atas.


// =========================================================
// END OF CATEGORIES.JSX
// =========================================================