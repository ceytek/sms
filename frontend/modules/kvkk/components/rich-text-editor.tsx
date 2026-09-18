"use client";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function RichTextEditor({ value, onChange }: Props) {
  const command = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2 text-xs">
        <button type="button" className="rounded px-2 py-1 hover:bg-white" onClick={() => command("bold")}>Kalın</button>
        <button type="button" className="rounded px-2 py-1 hover:bg-white" onClick={() => command("italic")}>İtalik</button>
        <button type="button" className="rounded px-2 py-1 hover:bg-white" onClick={() => command("insertUnorderedList")}>Liste</button>
        <button type="button" className="rounded px-2 py-1 hover:bg-white" onClick={() => command("formatBlock", "h3")}>Başlık</button>
        <button
          type="button"
          className="rounded px-2 py-1 hover:bg-white"
          onClick={() => {
            const url = window.prompt("Bağlantı URL");
            if (url) command("createLink", url);
          }}
        >
          Link
        </button>
      </div>
      <div
        className="min-h-[180px] px-3 py-2 text-sm outline-none"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value || "<p></p>" }}
        onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}
