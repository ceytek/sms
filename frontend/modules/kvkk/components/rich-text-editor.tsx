"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function RichTextEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const skipSyncRef = useRef(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    const next = value || "<p></p>";
    if (editor.innerHTML !== next) {
      editor.innerHTML = next;
    }
  }, [value]);

  const command = (cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    if (editorRef.current) {
      skipSyncRef.current = true;
      onChange(editorRef.current.innerHTML);
    }
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
        ref={editorRef}
        dir="ltr"
        lang="tr"
        className="min-h-[180px] px-3 py-2 text-left text-sm outline-none"
        style={{ direction: "ltr", unicodeBidi: "isolate" }}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => {
          skipSyncRef.current = true;
          onChange(event.currentTarget.innerHTML);
        }}
      />
    </div>
  );
}
