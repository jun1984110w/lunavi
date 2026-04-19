"use client";

import {
  createShippingAddressAction,
  deleteShippingAddressAction,
  setDefaultShippingAddressAction,
  updateShippingAddressAction,
  type AddressFormInput,
} from "@/lib/mypage/addressActions";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { MdDelete, MdEdit, MdStar, MdStarBorder } from "react-icons/md";

export type ShippingAddressRow = {
  id: number;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address: string;
  address_detail: string;
  is_default: boolean;
  created_at: string;
};

type SortMode = "label" | "created";

type Props = {
  initial: ShippingAddressRow[];
  isWholesale: boolean;
  locale: string;
};

const emptyForm: AddressFormInput = {
  label: "",
  recipientName: "",
  recipientPhone: "",
  address: "",
  addressDetail: "",
  isDefault: false,
};

/**
 * 배송지 CRUD, 별칭 검색, 기본 배송지, 도매용 정렬
 */
export function MypageAddressesClient({ initial, isWholesale, locale }: Props) {
  const t = useTranslations("mypage.addresses");
  const router = useRouter();

  const [rows, setRows] = useState(initial);
  // 서버에서 갱신된 목록(router.refresh)을 로컬 상태에 반영합니다.
  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>(isWholesale ? "label" : "created");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<AddressFormInput>(emptyForm);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const atCustomerLimit = !isWholesale && rows.length >= 10;

  const filteredSorted = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.label.toLowerCase().includes(q));
    }
    if (sort === "label") {
      const collator = new Intl.Collator(locale === "ko" ? "ko" : locale === "vi" ? "vi" : "en");
      list.sort((a, b) => collator.compare(a.label, b.label));
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [rows, search, sort, locale]);

  const openNew = () => {
    if (atCustomerLimit) {
      setErr(t("maxReached"));
      return;
    }
    setEditingId("new");
    setForm({ ...emptyForm, isDefault: rows.length === 0 });
    setErr(null);
    setMsg(null);
  };

  const openEdit = (row: ShippingAddressRow) => {
    setEditingId(row.id);
    setForm({
      label: row.label,
      recipientName: row.recipient_name,
      recipientPhone: row.recipient_phone,
      address: row.address,
      addressDetail: row.address_detail ?? "",
      isDefault: row.is_default,
    });
    setErr(null);
    setMsg(null);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const refresh = () => router.refresh();

  const handleSave = async () => {
    if (!form.label.trim()) {
      setErr(t("labelRequired"));
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);

    const res =
      editingId === "new"
        ? await createShippingAddressAction(form)
        : typeof editingId === "number"
          ? await updateShippingAddressAction(editingId, form)
          : { ok: false as const, code: "validation" as const };

    setBusy(false);

    if (!res.ok) {
      if (res.code === "max_addresses") setErr(t("maxReached"));
      else if (res.code === "db" && "message" in res) setErr(res.message ?? t("saveError"));
      else setErr(t("saveError"));
      return;
    }

    setMsg(t("saveOk"));
    closeForm();
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    const res = await deleteShippingAddressAction(id);
    setBusy(false);
    if (!res.ok) {
      setErr(t("saveError"));
      return;
    }
    setMsg(t("deleteOk"));
    refresh();
  };

  const handleSetDefault = async (id: number) => {
    setBusy(true);
    const res = await setDefaultShippingAddressAction(id);
    setBusy(false);
    if (!res.ok) {
      setErr(t("saveError"));
      return;
    }
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        is_default: r.id === id,
      })),
    );
    setMsg(t("defaultOk"));
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-medium">{t("searchLabel")}</label>
          <input
            className="mt-1 w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        {isWholesale ? (
          <div>
            <label className="block text-sm font-medium">{t("sortLabel")}</label>
            <select
              className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
            >
              <option value="label">{t("sortLabelAsc")}</option>
              <option value="created">{t("sortCreatedDesc")}</option>
            </select>
          </div>
        ) : null}
      </div>

      {!isWholesale ? <p className="text-xs text-neutral-600">{t("limitHint")}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openNew}
          disabled={atCustomerLimit || busy}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("add")}
        </button>
        {atCustomerLimit ? <span className="text-sm text-amber-700">{t("maxReached")}</span> : null}
      </div>

      {editingId !== null ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h3 className="font-bold">{editingId === "new" ? t("formNewTitle") : t("formEditTitle")}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-neutral-600">{t("fieldLabel")} *</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder={t("labelPlaceholder")}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">{t("fieldRecipient")}</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">{t("fieldPhone")}</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                value={form.recipientPhone}
                onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-neutral-600">{t("fieldAddress")}</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-neutral-600">{t("fieldAddressDetail")}</span>
              <input
                className="w-full rounded-md border border-neutral-300 px-3 py-2"
                value={form.addressDetail}
                onChange={(e) => setForm((f) => ({ ...f, addressDetail: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              {t("fieldDefault")}
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("save")}
            </button>
            <button type="button" onClick={closeForm} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}

      <ul className="space-y-3">
        {filteredSorted.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSetDefault(row.id)}
                  className="text-brand disabled:opacity-40"
                  title={t("setDefault")}
                  disabled={busy || row.is_default}
                  aria-label={t("setDefault")}
                >
                  {row.is_default ? <MdStar className="h-6 w-6" /> : <MdStarBorder className="h-6 w-6 text-neutral-400" />}
                </button>
                <span className="text-lg font-bold">{row.label}</span>
                {row.is_default ? (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{t("badgeDefault")}</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-neutral-800">
                {row.recipient_name} · {row.recipient_phone}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {row.address}
                {row.address_detail ? `, ${row.address_detail}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="rounded-md border border-neutral-300 p-2 text-neutral-700 hover:bg-neutral-50"
                aria-label={t("edit")}
              >
                <MdEdit className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(row.id)}
                className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                aria-label={t("delete")}
              >
                <MdDelete className="h-5 w-5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {filteredSorted.length === 0 ? <p className="text-center text-sm text-neutral-500">{t("listEmpty")}</p> : null}
    </div>
  );
}
