export function formatRupiah(value) {
  const num = Number(value || 0);
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}
