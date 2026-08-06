import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  Tags,
  PiggyBank,
  Target,
  ChartColumn,
  Users,
  History,
} from "lucide-react";

export const menu = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/transaksi",
    label: "Transaksi",
    icon: ArrowRightLeft,
  },
  {
    to: "/rekening",
    label: "Rekening & Dompet",
    icon: Wallet,
  },
  {
    to: "/kategori",
    label: "Kategori",
    icon: Tags,
  },
  {
    to: "/budget",
    label: "Budget",
    icon: PiggyBank,
  },
  {
    to: "/target-tabungan",
    label: "Target Tabungan",
    icon: Target,
  },
  {
    to: "/laporan",
    label: "Laporan",
    icon: ChartColumn,
  },
  {
    to: "/anggota",
    label: "Anggota Keluarga",
    icon: Users,
  },
  {
    to: "/audit-log",
    label: "Audit Log",
    icon: History,
  },
];