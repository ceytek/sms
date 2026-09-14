"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  CustomerType,
  CUSTOMER_TYPE_LABELS,
} from "../types";
import {
  CustomerCategory,
  CustomerSubcategory,
  referenceService,
} from "../services/reference.service";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

interface ClassificationValue {
  customerType?: CustomerType | "";
  categoryId?: string;
  subcategoryId?: string;
}

interface ClassificationFieldsProps {
  value: ClassificationValue;
  onChange: (patch: ClassificationValue) => void;
  currentCategory?: { id: string; name: string } | null;
  currentSubcategory?: { id: string; name: string } | null;
}

export function ClassificationFields({
  value,
  onChange,
  currentCategory,
  currentSubcategory,
}: ClassificationFieldsProps) {
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CustomerSubcategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    referenceService
      .getCustomerCategories()
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!value.categoryId) {
      setSubcategories([]);
      return;
    }
    let cancelled = false;
    referenceService
      .getCustomerSubcategories(value.categoryId)
      .then((items) => {
        if (!cancelled) setSubcategories(items);
      })
      .catch(() => {
        if (!cancelled) setSubcategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [value.categoryId]);

  const categoryOptions = mergeCurrent(categories, currentCategory);
  const subcategoryOptions = mergeCurrent(subcategories, currentSubcategory);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="customerType">Müşteri Tipi</Label>
        <select
          id="customerType"
          value={value.customerType ?? ""}
          onChange={(event) =>
            onChange({ customerType: event.target.value as CustomerType | "" })
          }
          className={selectClass}
        >
          <option value="">Seçin</option>
          {Object.entries(CUSTOMER_TYPE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Ana Kategori</Label>
        <select
          id="categoryId"
          value={value.categoryId ?? ""}
          onChange={(event) =>
            onChange({
              categoryId: event.target.value,
              subcategoryId: "",
            })
          }
          className={selectClass}
        >
          <option value="">Seçin</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subcategoryId">Alt Kategori</Label>
        <select
          id="subcategoryId"
          value={value.subcategoryId ?? ""}
          onChange={(event) => onChange({ subcategoryId: event.target.value })}
          disabled={!value.categoryId}
          className={selectClass}
        >
          <option value="">{value.categoryId ? "Seçin" : "Önce ana kategori seçin"}</option>
          {subcategoryOptions.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function mergeCurrent<T extends { id: string; name: string }>(
  items: T[],
  current?: { id: string; name: string } | null,
) {
  if (!current?.id) return items;
  if (items.some((item) => item.id === current.id)) return items;
  return [{ ...current } as T, ...items];
}
