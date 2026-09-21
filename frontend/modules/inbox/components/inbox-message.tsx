import type { InboxNotification } from "../types";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function Bold({ children }: { children: string }) {
  return <strong className="font-semibold text-slate-800">{children}</strong>;
}

export function InboxMessage({ item }: { item: InboxNotification }) {
  const payload = item.payload;
  const dealer = text(payload?.dealerName);
  const username = text(payload?.requesterUsername);
  const customer = text(payload?.customerName);
  const code = text(payload?.customerCode);
  const originator = text(payload?.originatorName);

  if (item.eventType === "ORIGINATOR_REQUESTED" && (dealer || customer || username)) {
    return (
      <p className="mt-0.5 text-xs leading-5 text-slate-600">
        {username ? (
          <>
            <Bold>{username}</Bold>
            {dealer ? (
              <>
                {" "}
                (<Bold>{dealer}</Bold>)
              </>
            ) : null}
          </>
        ) : dealer ? (
          <Bold>{dealer}</Bold>
        ) : (
          "Bir bayi"
        )}
        {", "}
        {customer ? <Bold>{customer}</Bold> : "müşterisi"}
        {code ? ` (${code})` : null}
        {` için ${originator || "bir originatör"} başlığını talep etti.`}
      </p>
    );
  }

  if (
    item.eventType === "ORIGINATOR_APPROVED" ||
    item.eventType === "ORIGINATOR_PASSIVATED" ||
    item.eventType === "ORIGINATOR_BANNED"
  ) {
    const action =
      item.eventType === "ORIGINATOR_APPROVED"
        ? payload?.previousStatus === "PASSIVE"
          ? "yeniden aktif edildi"
          : "onaylandı ve aktif edildi"
        : item.eventType === "ORIGINATOR_PASSIVATED"
          ? "pasife alındı"
          : "yasaklandı";
    if (originator || customer) {
      return (
        <p className="mt-0.5 text-xs leading-5 text-slate-600">
          {originator || "Başlık"} başlığı {action}.
          {customer ? (
            <>
              {" "}
              (<Bold>{customer}</Bold>)
            </>
          ) : null}
        </p>
      );
    }
  }

  return <p className="mt-0.5 text-xs leading-5 text-slate-600">{item.body}</p>;
}
